package presentation

import (
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/slack-go/slack"
)

func (h *Handler) AttendanceSlach(c echo.Context) error {
	const CHECKIN = "checkin"
	const CHECKOUT = "checkout"

	s, err := slack.SlashCommandParse(c.Request())
	if err != nil {
		fmt.Println("SlashCommandParse error:", err)
		return c.JSON(http.StatusOK, slack.Msg{Text: err.Error()})
	}
	var message string
	switch s.Command {
	case "/checkin":
		attendanceLog, err := h.usecase.AddAttendanceLogCheckin(c.Request().Context(), s.TeamID, s.ChannelID, s.UserID, CHECKIN)
		if err != nil {
			fmt.Println("Error: /checkin :", err.Error())
			return c.JSON(http.StatusOK, slack.Msg{Text: "Failed to add attendance In log: " + err.Error()})
		}
		message = fmt.Sprintf("%s: %s", attendanceLog.WorkplaceID, attendanceLog.Action)
	case "/checkout":
		attendanceLog, err := h.usecase.AddAttendanceLogCheckout(c.Request().Context(), s.TeamID, s.ChannelID, s.UserID, CHECKOUT)
		if err != nil {
			fmt.Println("Error: /checkout :", err.Error())
			return c.JSON(http.StatusOK, slack.Msg{Text: "Failed to add attendance log: " + err.Error()})
		}
		message = fmt.Sprintf("%s: %s", attendanceLog.WorkplaceID, attendanceLog.Action)
	case "/subscribe-workplace":
		workspaceName := s.Text
		_, err := h.usecase.SubscribeWorkplace(c.Request().Context(), s.TeamID, s.ChannelID, s.UserID, workspaceName)
		if err != nil {
			fmt.Println("Error: /subscribe-workplace :", err.Error())
			return c.JSON(http.StatusOK, slack.Msg{Text: "Failed to add attendance log: " + err.Error()})
		}
		message = fmt.Sprintf("登録完了: %s", workspaceName)
	default:
		message = "不明なコマンドです。"
	}

	return c.JSON(http.StatusOK, slack.Msg{Text: message})
}
