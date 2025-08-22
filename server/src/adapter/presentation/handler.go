package presentation

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
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

type SlackOAuthResponse struct {
	Ok          bool   `json:"ok"`
	AccessToken string `json:"access_token"` // Bot Token
	Scope       string `json:"scope"`
	Team        struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"team"`
	AuthedUser struct {
		ID          string `json:"id"`
		AccessToken string `json:"access_token"` // User Token
	} `json:"authed_user"`
	Error string `json:"error,omitempty"`
}

type SlackUserResponse struct {
	Ok   bool `json:"ok"`
	User struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"user"`
	Error string `json:"error,omitempty"`
}

type SlackChannel struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	IsGroup bool   `json:"is_group"`
	IsMember bool  `json:"is_member"`
}

type SlackChannelsResponse struct {
	Ok       bool           `json:"ok"`
	Channels []SlackChannel `json:"channels"`
	Groups   []SlackChannel `json:"groups"`
	// conversations.list API では conversations フィールドを使用
	Conversations []SlackChannel `json:"conversations"`
	Error         string         `json:"error,omitempty"`
}

func (h *Handler) SlackOAuthCallback(c echo.Context) error {
	code := c.QueryParam("code")
	// state := c.QueryParam("state")
	error := c.QueryParam("error")

	if error != "" {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error":   error,
			"message": "Slack認証がキャンセルされました",
		})
	}

	if code == "" {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error":   "missing_code",
			"message": "認証コードが不足しています",
		})
	}

	clientID := os.Getenv("SLACK_CLIENT_ID")
	clientSecret := os.Getenv("SLACK_CLIENT_SECRET")
	redirectURI := os.Getenv("SLACK_REDIRECT_URI")

	if clientID == "" || clientSecret == "" || redirectURI == "" {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "config_error",
			"message": "Slack OAuth設定が不足しています",
		})
	}

	data := url.Values{}
	data.Set("client_id", clientID)
	data.Set("client_secret", clientSecret)
	data.Set("code", code)
	data.Set("redirect_uri", redirectURI)

	resp, err := http.PostForm("https://slack.com/api/oauth.v2.access", data)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "oauth_request_failed",
			"message": "OAuth認証リクエストに失敗しました: " + err.Error(),
		})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "response_read_failed",
			"message": "レスポンスの読み込みに失敗しました: " + err.Error(),
		})
	}

	var oauthResp SlackOAuthResponse
	if err := json.Unmarshal(body, &oauthResp); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "json_parse_failed",
			"message": "レスポンスのパースに失敗しました: " + err.Error(),
		})
	}

	if !oauthResp.Ok {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error":   oauthResp.Error,
			"message": "Slack認証に失敗しました: " + oauthResp.Error,
		})
	}

	// OAuth v2 では追加の users.info 呼び出しは不要
	// 必要に応じて後でユーザー名を取得できるが、基本情報は OAuth レスポンスに含まれる
	session := map[string]interface{}{
		"user_id":       oauthResp.AuthedUser.ID,
		"team_id":       oauthResp.Team.ID,
		"team_name":     oauthResp.Team.Name,
		"user_name":     oauthResp.AuthedUser.ID, // 一時的にユーザーIDを使用
		"scope":         oauthResp.Scope,
		"access_token":  oauthResp.AccessToken, // Bot Token (チャンネル情報取得用)
		"user_token":    oauthResp.AuthedUser.AccessToken, // User Token
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "認証が完了しました",
		"session": session,
	})
}

func (h *Handler) SlackOAuthLogin(c echo.Context) error {
	clientID := os.Getenv("SLACK_CLIENT_ID")
	redirectURI := os.Getenv("SLACK_REDIRECT_URI")

	if clientID == "" || redirectURI == "" {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "config_error",
			"message": "Slack OAuth設定が不足しています",
		})
	}

	scopes := []string{"channels:read", "groups:read", "channels:history", "groups:history"}
	state := fmt.Sprintf("%d", time.Now().Unix())

	authURL := fmt.Sprintf(
		"https://slack.com/oauth/v2/authorize?client_id=%s&scope=%s&redirect_uri=%s&state=%s",
		clientID,
		url.QueryEscape(strings.Join(scopes, ",")),
		url.QueryEscape(redirectURI),
		state,
	)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"auth_url": authURL,
		"state":    state,
	})
}

func (h *Handler) GetSlackChannels(c echo.Context) error {
	accessToken := c.QueryParam("access_token")
	if accessToken == "" {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error":   "missing_access_token",
			"message": "アクセストークンが必要です",
		})
	}

	// パブリックチャンネルを取得
	channelsReq, err := http.NewRequest("GET", "https://slack.com/api/conversations.list?types=public_channel,private_channel", nil)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "channels_request_creation_failed",
			"message": "チャンネル一覧リクエストの作成に失敗しました: " + err.Error(),
		})
	}
	channelsReq.Header.Set("Authorization", "Bearer "+accessToken)
	
	client := &http.Client{}
	channelsResp, err := client.Do(channelsReq)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "channels_request_failed",
			"message": "チャンネル一覧の取得に失敗しました: " + err.Error(),
		})
	}
	defer channelsResp.Body.Close()

	channelsBody, err := io.ReadAll(channelsResp.Body)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "channels_response_read_failed",
			"message": "チャンネル一覧レスポンスの読み込みに失敗しました: " + err.Error(),
		})
	}

	var slackChannelsResp SlackChannelsResponse
	if err := json.Unmarshal(channelsBody, &slackChannelsResp); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "channels_json_parse_failed",
			"message": "チャンネル一覧のパースに失敗しました: " + err.Error(),
		})
	}

	if !slackChannelsResp.Ok {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error":   slackChannelsResp.Error,
			"message": "チャンネル一覧の取得に失敗しました: " + slackChannelsResp.Error,
		})
	}

	// conversations.list API では conversations フィールドを使用
	channels := slackChannelsResp.Conversations
	if len(channels) == 0 {
		// フォールバック: 古い形式も確認
		channels = slackChannelsResp.Channels
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":  true,
		"channels": channels,
		"message":  fmt.Sprintf("チャンネル一覧を取得しました (%d件)", len(channels)),
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
