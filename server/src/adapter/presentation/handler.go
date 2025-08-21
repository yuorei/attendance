package presentation

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/yuorei/attendance/src/domain"
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

type CheckInRequest struct {
	TeamID    string `json:"team_id" validate:"required"`
	ChannelID string `json:"channel_id" validate:"required"`
	UserID    string `json:"user_id" validate:"required"`
}

type CheckOutRequest struct {
	TeamID    string `json:"team_id" validate:"required"`
	ChannelID string `json:"channel_id" validate:"required"`
	UserID    string `json:"user_id" validate:"required"`
}

type SubscribeWorkplaceRequest struct {
	TeamID        string `json:"team_id" validate:"required"`
	ChannelID     string `json:"channel_id" validate:"required"`
	UserID        string `json:"user_id" validate:"required"`
	WorkplaceName string `json:"workplace_name" validate:"required"`
}

type EditAttendanceRequest struct {
	ID          string `json:"id" validate:"required"`
	NewDateTime string `json:"new_datetime" validate:"required"`
}

type AttendanceResponse struct {
	AttendanceLog *domain.AttendanceLog `json:"attendance_log,omitempty"`
	Message       string                `json:"message"`
	Success       bool                  `json:"success"`
}

type WorkplaceResponse struct {
	WorkplaceBinding *domain.WorkplaceBindings `json:"workplace_binding,omitempty"`
	Message          string                    `json:"message"`
	Success          bool                      `json:"success"`
}

type MonthlyHoursResponse struct {
	AttendanceLogs []domain.AttendanceLog `json:"attendance_logs,omitempty"`
	FormattedData  string                 `json:"formatted_data,omitempty"`
	Message        string                 `json:"message"`
	Success        bool                   `json:"success"`
}

func (h *Handler) CheckIn(c echo.Context) error {
	var req CheckInRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, AttendanceResponse{
			Message: "Invalid request format",
			Success: false,
		})
	}

	attendanceLog, err := h.usecase.AddAttendanceLogStart(c.Request().Context(), req.TeamID, req.ChannelID, req.UserID, "start")
	if err != nil {
		return c.JSON(http.StatusInternalServerError, AttendanceResponse{
			Message: "Failed to check in: " + err.Error(),
			Success: false,
		})
	}

	return c.JSON(http.StatusOK, AttendanceResponse{
		AttendanceLog: attendanceLog,
		Message:       attendanceLog.WorkplaceID + ": 出勤",
		Success:       true,
	})
}

func (h *Handler) CheckOut(c echo.Context) error {
	var req CheckOutRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, AttendanceResponse{
			Message: "Invalid request format",
			Success: false,
		})
	}

	attendanceLog, err := h.usecase.AddAttendanceLogEnd(c.Request().Context(), req.TeamID, req.ChannelID, req.UserID, "end")
	if err != nil {
		return c.JSON(http.StatusInternalServerError, AttendanceResponse{
			Message: "Failed to check out: " + err.Error(),
			Success: false,
		})
	}

	return c.JSON(http.StatusOK, AttendanceResponse{
		AttendanceLog: attendanceLog,
		Message:       attendanceLog.WorkplaceID + ": 退勤",
		Success:       true,
	})
}

func (h *Handler) SubscribeWorkplace(c echo.Context) error {
	var req SubscribeWorkplaceRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, WorkplaceResponse{
			Message: "Invalid request format",
			Success: false,
		})
	}

	workplaceBinding, err := h.usecase.SubscribeWorkplace(c.Request().Context(), req.TeamID, req.ChannelID, req.UserID, req.WorkplaceName)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, WorkplaceResponse{
			Message: "Failed to subscribe workplace: " + err.Error(),
			Success: false,
		})
	}

	return c.JSON(http.StatusOK, WorkplaceResponse{
		WorkplaceBinding: workplaceBinding,
		Message:          "職場登録完了: " + req.WorkplaceName,
		Success:          true,
	})
}

func (h *Handler) GetMonthlyHours(c echo.Context) error {
	teamID := c.QueryParam("team_id")
	channelID := c.QueryParam("channel_id")
	userID := c.QueryParam("user_id")
	yearMonth := c.QueryParam("year_month")

	if teamID == "" || channelID == "" || userID == "" {
		return c.JSON(http.StatusBadRequest, MonthlyHoursResponse{
			Message: "team_id, channel_id, and user_id are required",
			Success: false,
		})
	}

	if yearMonth == "" {
		jst, _ := time.LoadLocation("Asia/Tokyo")
		now := time.Now().In(jst)
		yearMonth = now.Format("200601")
	}

	if len(yearMonth) != 6 {
		return c.JSON(http.StatusBadRequest, MonthlyHoursResponse{
			Message: "年月の形式が不正です。",
			Success: false,
		})
	}

	year := yearMonth[:4]
	month := yearMonth[4:]
	attendanceLogs, err := h.usecase.GetAttendanceLogListByUserAndMonth(c.Request().Context(), teamID, channelID, userID, year, month)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, MonthlyHoursResponse{
			Message: "Failed to get attendance log: " + err.Error(),
			Success: false,
		})
	}

	if len(attendanceLogs) == 0 {
		return c.JSON(http.StatusOK, MonthlyHoursResponse{
			AttendanceLogs: []domain.AttendanceLog{},
			Message:        "出勤記録がありません。",
			Success:        true,
		})
	}

	workplaceName := attendanceLogs[0].WorkplaceID
	formattedData := FormatAttendance(attendanceLogs, workplaceName)

	return c.JSON(http.StatusOK, MonthlyHoursResponse{
		AttendanceLogs: attendanceLogs,
		FormattedData:  formattedData,
		Message:        "Successfully retrieved attendance logs",
		Success:        true,
	})
}

func (h *Handler) EditAttendance(c echo.Context) error {
	var req EditAttendanceRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, AttendanceResponse{
			Message: "Invalid request format",
			Success: false,
		})
	}

	jst, _ := time.LoadLocation("Asia/Tokyo")
	newTime, err := time.ParseInLocation("2006-01-02 15:04", req.NewDateTime, jst)
	if err != nil {
		return c.JSON(http.StatusBadRequest, AttendanceResponse{
			Message: "時刻の形式が不正です。形式: YYYY-MM-DD HH:MM",
			Success: false,
		})
	}

	updatedLog, err := h.usecase.UpdateAttendanceLog(c.Request().Context(), req.ID, newTime)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, AttendanceResponse{
			Message: "勤怠記録の更新に失敗しました: " + err.Error(),
			Success: false,
		})
	}

	return c.JSON(http.StatusOK, AttendanceResponse{
		AttendanceLog: updatedLog,
		Message:       "勤怠記録を更新しました ID: " + updatedLog.ID + " 新しい時刻: " + newTime.Format("2006-01-02 15:04"),
		Success:       true,
	})
}

func (h *Handler) DeleteAttendance(c echo.Context) error {
	id := c.Param("id")
	if id == "" {
		return c.JSON(http.StatusBadRequest, AttendanceResponse{
			Message: "ID is required",
			Success: false,
		})
	}

	err := h.usecase.DeleteAttendanceLog(c.Request().Context(), id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, AttendanceResponse{
			Message: "勤怠記録の削除に失敗しました: " + err.Error(),
			Success: false,
		})
	}

	return c.JSON(http.StatusOK, AttendanceResponse{
		Message: "勤怠記録を削除しました ID: " + id,
		Success: true,
	})
}

// 今は使わない
// func (h *Handler) AttendanceLogListByUserAndMonth(c echo.Context) error {
// 	teamId := c.Param("team_id")
// 	channelId := c.Param("channel_id")
// 	userId := ""
// 	year := c.Param("year")
// 	month := c.Param("month")

// 	attendanceLogs, err := h.usecase.GetAttendanceLogListByUserAndMonth(c.Request().Context(), teamId, channelId, userId, year, month)
// 	if err != nil {
// 		return c.JSON(http.StatusInternalServerError, err.Error())
// 	}

// 	return c.JSON(http.StatusOK, attendanceLogs)
// }
