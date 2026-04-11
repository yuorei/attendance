package presentation

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/slack-go/slack"
)

type slackEvent struct {
	Type      string          `json:"type"`
	Challenge string          `json:"challenge"`
	TeamID    string          `json:"team_id"`
	Event     json.RawMessage `json:"event"`
}

type appHomeOpenedEvent struct {
	Type   string `json:"type"`
	User   string `json:"user"`
	Tab    string `json:"tab"`
	ViewID string `json:"view_id"`
}

func (h *Handler) SlackEvents(c echo.Context) error {
	var payload slackEvent
	if err := json.NewDecoder(c.Request().Body).Decode(&payload); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid payload"})
	}

	// URL検証チャレンジ
	if payload.Type == "url_verification" {
		return c.JSON(http.StatusOK, map[string]string{"challenge": payload.Challenge})
	}

	if payload.Type != "event_callback" {
		return c.NoContent(http.StatusOK)
	}

	var ev appHomeOpenedEvent
	if err := json.Unmarshal(payload.Event, &ev); err != nil {
		return c.NoContent(http.StatusOK)
	}

	if ev.Type != "app_home_opened" || ev.Tab != "home" {
		return c.NoContent(http.StatusOK)
	}

	// App Home を非同期で更新（3秒制限を超えないよう即レスポンス）
	teamID := payload.TeamID
	userID := ev.User
	go func() {
		if err := h.publishHomeView(context.Background(), teamID, userID); err != nil {
			fmt.Println("publishHomeView error:", err)
		}
	}()

	return c.NoContent(http.StatusOK)
}

func (h *Handler) publishHomeView(ctx context.Context, teamID, userID string) error {
	botToken := os.Getenv("SLACK_BOT_TOKEN")
	if botToken == "" {
		return fmt.Errorf("SLACK_BOT_TOKEN is not set")
	}

	api := slack.New(botToken)

	// ユーザーの職場一覧を取得
	bindings, err := h.usecase.GetWorkplaceBindingsByUser(ctx, teamID, userID)
	if err != nil || len(bindings) == 0 {
		// 職場未登録の場合はガイドを表示
		view := slack.HomeTabViewRequest{
			Type: slack.VTHomeTab,
			Blocks: slack.Blocks{
				BlockSet: []slack.Block{
					slack.NewSectionBlock(
						slack.NewTextBlockObject("mrkdwn",
							"*勤怠管理*\n\nまだ職場が登録されていません。\nスラッシュコマンド `/subscribe-workplace <職場名>` で職場を登録してください。",
							false, false),
						nil, nil,
					),
				},
			},
		}
		_, err = api.PublishView(userID, view, "")
		return err
	}

	// 職場ごとにボタンを生成
	blocks := []slack.Block{
		slack.NewSectionBlock(
			slack.NewTextBlockObject("mrkdwn", "*勤怠管理*\n操作を選択してください", false, false),
			nil, nil,
		),
		slack.NewDividerBlock(),
	}

	for _, b := range bindings {
		blocks = append(blocks,
			slack.NewSectionBlock(
				slack.NewTextBlockObject("mrkdwn", fmt.Sprintf("*%s*", b.Workplace), false, false),
				nil, nil,
			),
			slack.NewActionBlock("attendance_actions_"+b.ID,
				slack.NewButtonBlockElement(
					"check_in",
					fmt.Sprintf("check_in:%s", b.CannelId),
					slack.NewTextBlockObject("plain_text", "出勤", true, false),
				),
				slack.NewButtonBlockElement(
					"check_out",
					fmt.Sprintf("check_out:%s", b.CannelId),
					slack.NewTextBlockObject("plain_text", "退勤", true, false),
				),
				slack.NewButtonBlockElement(
					"monthly_report",
					fmt.Sprintf("monthly_report:%s", b.CannelId),
					slack.NewTextBlockObject("plain_text", "今月の勤怠", true, false),
				),
			),
			slack.NewDividerBlock(),
		)
	}

	view := slack.HomeTabViewRequest{
		Type: slack.VTHomeTab,
		Blocks: slack.Blocks{
			BlockSet: blocks,
		},
	}

	_, err = api.PublishView(userID, view, "")
	return err
}
