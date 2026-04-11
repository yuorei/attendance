package presentation

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/slack-go/slack"
)

func (h *Handler) SlackInteractiveAction(c echo.Context) error {
	payloadStr := c.FormValue("payload")
	if payloadStr == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "payload is missing"})
	}

	var interaction slack.InteractionCallback
	if err := json.Unmarshal([]byte(payloadStr), &interaction); err != nil {
		fmt.Println("InteractionCallback unmarshal error:", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid payload"})
	}

	if interaction.Type != slack.InteractionTypeBlockActions {
		return c.JSON(http.StatusOK, map[string]string{})
	}

	if len(interaction.ActionCallback.BlockActions) == 0 {
		return c.JSON(http.StatusOK, map[string]string{})
	}

	action := interaction.ActionCallback.BlockActions[0]
	teamID := interaction.Team.ID
	userID := interaction.User.ID

	// ボタンの value は "action:channelID" 形式（App Home の場合）
	// スラッシュコマンドメニューからの場合はシンプルな action_id のみ
	actionID, channelID := parseActionValue(action.ActionID, action.Value, interaction.Channel.ID)

	switch actionID {
	case "check_in":
		attendanceLog, err := h.usecase.AddAttendanceLogStart(c.Request().Context(), teamID, channelID, userID, "start")
		if err != nil {
			fmt.Println("Error: check_in button:", err.Error())
			return c.JSON(http.StatusOK, slack.Msg{
				ReplaceOriginal: false,
				Text:            "出勤の記録に失敗しました: " + err.Error(),
			})
		}
		// App Home を再描画
		go func() {
			if err := h.publishHomeView(c.Request().Context(), teamID, userID); err != nil {
				fmt.Println("publishHomeView error:", err)
			}
		}()
		return c.JSON(http.StatusOK, slack.Msg{
			ReplaceOriginal: false,
			Blocks: slack.Blocks{
				BlockSet: []slack.Block{
					slack.NewSectionBlock(
						slack.NewTextBlockObject("mrkdwn",
							fmt.Sprintf("*出勤しました*\n職場: %s\n時刻: %s",
								attendanceLog.WorkplaceID,
								formatNowJST(),
							), false, false),
						nil, nil,
					),
				},
			},
		})

	case "check_out":
		attendanceLog, err := h.usecase.AddAttendanceLogEnd(c.Request().Context(), teamID, channelID, userID, "end")
		if err != nil {
			fmt.Println("Error: check_out button:", err.Error())
			return c.JSON(http.StatusOK, slack.Msg{
				ReplaceOriginal: false,
				Text:            "退勤の記録に失敗しました: " + err.Error(),
			})
		}
		go func() {
			if err := h.publishHomeView(c.Request().Context(), teamID, userID); err != nil {
				fmt.Println("publishHomeView error:", err)
			}
		}()
		return c.JSON(http.StatusOK, slack.Msg{
			ReplaceOriginal: false,
			Blocks: slack.Blocks{
				BlockSet: []slack.Block{
					slack.NewSectionBlock(
						slack.NewTextBlockObject("mrkdwn",
							fmt.Sprintf("*退勤しました*\n職場: %s\n時刻: %s",
								attendanceLog.WorkplaceID,
								formatNowJST(),
							), false, false),
						nil, nil,
					),
				},
			},
		})

	case "monthly_report":
		jst, _ := time.LoadLocation("Asia/Tokyo")
		now := time.Now().In(jst)
		year := now.Format("2006")
		month := now.Format("01")

		attendanceLogs, err := h.usecase.GetAttendanceLogListByUserAndMonth(c.Request().Context(), teamID, channelID, userID, year, month)
		if err != nil {
			fmt.Println("Error: monthly_report button:", err.Error())
			return c.JSON(http.StatusOK, slack.Msg{
				ReplaceOriginal: false,
				Text:            "勤怠記録の取得に失敗しました: " + err.Error(),
			})
		}
		if len(attendanceLogs) == 0 {
			return c.JSON(http.StatusOK, slack.Msg{
				ReplaceOriginal: false,
				Text:            "今月の出勤記録がありません。",
			})
		}

		workplaceName := attendanceLogs[0].WorkplaceID
		report := FormatAttendance(attendanceLogs, workplaceName)
		return c.JSON(http.StatusOK, slack.Msg{
			ReplaceOriginal: false,
			Blocks: slack.Blocks{
				BlockSet: []slack.Block{
					slack.NewSectionBlock(
						slack.NewTextBlockObject("mrkdwn", "```\n"+report+"\n```", false, false),
						nil, nil,
					),
				},
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]string{})
}

// parseActionValue はボタン値から actionID と channelID を取得する。
// App Home のボタンは value = "action:channelID" 形式。
// チャンネル上のボタンはそのまま channel.ID を使う。
func parseActionValue(actionID, value, fallbackChannelID string) (string, string) {
	if strings.Contains(value, ":") {
		parts := strings.SplitN(value, ":", 2)
		return parts[0], parts[1]
	}
	return actionID, fallbackChannelID
}

func formatNowJST() string {
	jst, _ := time.LoadLocation("Asia/Tokyo")
	return time.Now().In(jst).Format("2006-01-02 15:04")
}
