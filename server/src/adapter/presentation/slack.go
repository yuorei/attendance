package presentation

import (
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/slack-go/slack"
)

func (h *Handler) AttendanceSlach(c echo.Context) error {
	const START = "start"
	const END = "end"

	s, err := slack.SlashCommandParse(c.Request())
	if err != nil {
		fmt.Println("SlashCommandParse error:", err)
		return c.JSON(http.StatusOK, slack.Msg{Text: err.Error()})
	}
	var message string
	switch s.Command {
	case "/start-work":
		attendanceLog, err := h.usecase.AddAttendanceLogStart(c.Request().Context(), s.TeamID, s.ChannelID, s.UserID, START)
		if err != nil {
			fmt.Println("Error: /start-work :", err.Error())
			return c.JSON(http.StatusOK, slack.Msg{Text: "Failed to add attendance In log: " + err.Error()})
		}
		message = fmt.Sprintf("%s: 出勤", attendanceLog.WorkplaceID)
	case "/end-work":
		attendanceLog, err := h.usecase.AddAttendanceLogEnd(c.Request().Context(), s.TeamID, s.ChannelID, s.UserID, END)
		if err != nil {
			fmt.Println("Error: /end-work :", err.Error())
			return c.JSON(http.StatusOK, slack.Msg{Text: "Failed to add attendance log: " + err.Error()})
		}
		message = fmt.Sprintf("%s: 退勤", attendanceLog.WorkplaceID)
	case "/subscribe-workplace":
		workspaceName := s.Text
		_, err := h.usecase.SubscribeWorkplace(c.Request().Context(), s.TeamID, s.ChannelID, s.UserID, workspaceName)
		if err != nil {
			fmt.Println("Error: /subscribe-workplace :", err.Error())
			return c.JSON(http.StatusOK, slack.Msg{Text: "Failed to add attendance log: " + err.Error()})
		}
		message = fmt.Sprintf("職場登録完了: %s", workspaceName)
	default:
		message = "不明なコマンドです。"
	}

	return c.JSON(http.StatusOK, slack.Msg{Text: message})
}
