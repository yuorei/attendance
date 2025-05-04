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
