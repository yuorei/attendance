package presentation

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/yuorei/attendance/src/usecase"
)

type Handler struct {
	usecase *usecase.UseCase
}

func NewHandler(repository *usecase.Repository) *Handler {
	return &Handler{
		usecase: usecase.NewUseCase(repository),
	}
}

type SlackEvent struct {
	Type      string `json:"type"`
	Event     Event  `json:"event"`
	Challenge string `json:"challenge"`
}
type Event struct {
	Type    string `json:"type"`
	User    string `json:"user"`
	Text    string `json:"text"`
	Channel string `json:"channel"`
	Ts      string `json:"ts"`
}

func (h *Handler) Handler2(c echo.Context) error {
	var slackEvent SlackEvent
	if err := c.Bind(&slackEvent); err != nil {
		log.Printf("Error binding Slack event: %v", err)
		return c.NoContent(http.StatusBadRequest)
	}

	// Slack Event APIのURL検証用
	if slackEvent.Type == "url_verification" {
		return c.String(http.StatusOK, slackEvent.Challenge)
	}

	// Slackのメッセージイベント
	if slackEvent.Event.Type == "message" && slackEvent.Event.User != "" {
		text := strings.ToLower(slackEvent.Event.Text)
		userID := slackEvent.Event.User
		timestamp := slackEvent.Event.Ts
		fmt.Println(text, userID, timestamp)
	}

	_, err := h.usecase.AddAttendanceLog(c.Request().Context(), "campaignID")
	if err != nil {
		return c.String(http.StatusInternalServerError, "Failed to add attendance log: "+err.Error())
	}
	return c.String(http.StatusOK, "OK")
}

func (h *Handler) HealthCheck(c echo.Context) error {
	return c.String(http.StatusOK, "OK")
}
