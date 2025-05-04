package presentation

import (
	"net/http"

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

func (h *Handler) HealthCheck(c echo.Context) error {
	return c.String(http.StatusOK, "OK")
}

func (h *Handler) AttendanceLogListByUserAndMonth(c echo.Context) error {
	teamId := c.Param("team_id")
	channelId := c.Param("channel_id")
	userId := ""
	year := c.Param("year")
	month := c.Param("month")

	attendanceLogs, err := h.usecase.GetAttendanceLogListByUserAndMonth(c.Request().Context(), teamId, channelId, userId, year, month)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, attendanceLogs)
}
