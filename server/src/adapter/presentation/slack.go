package presentation

import (
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/slack-go/slack"
	"github.com/yuorei/attendance/src/domain"
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
	case "/start-work", "/start-work-dev":
		attendanceLog, err := h.usecase.AddAttendanceLogStart(c.Request().Context(), s.TeamID, s.ChannelID, s.UserID, START)
		if err != nil {
			fmt.Println("Error: /start-work :", err.Error())
			return c.JSON(http.StatusOK, slack.Msg{Text: "Failed to add attendance In log: " + err.Error()})
		}
		message = fmt.Sprintf("%s: 出勤", attendanceLog.WorkplaceID)
	case "/end-work", "/end-work-dev":
		attendanceLog, err := h.usecase.AddAttendanceLogEnd(c.Request().Context(), s.TeamID, s.ChannelID, s.UserID, END)
		if err != nil {
			fmt.Println("Error: /end-work :", err.Error())
			return c.JSON(http.StatusOK, slack.Msg{Text: "Failed to add attendance log: " + err.Error()})
		}
		message = fmt.Sprintf("%s: 退勤", attendanceLog.WorkplaceID)
	case "/subscribe-workplace", "/subscribe-workplace-dev":
		workspaceName := s.Text
		_, err := h.usecase.SubscribeWorkplace(c.Request().Context(), s.TeamID, s.ChannelID, s.UserID, workspaceName)
		if err != nil {
			fmt.Println("Error: /subscribe-workplace :", err.Error())
			return c.JSON(http.StatusOK, slack.Msg{Text: "Failed to add attendance log: " + err.Error()})
		}
		message = fmt.Sprintf("職場登録完了: %s", workspaceName)
	case "/monthly-hours", "/monthly-hours-dev":
		// 年月の形式はYYYYMM
		yearMonth := s.Text
		if yearMonth == "" {
			// テキストが空の場合、日本時間での現在の年月を使用
			jst, _ := time.LoadLocation("Asia/Tokyo")
			now := time.Now().In(jst)
			yearMonth = now.Format("200601") // YYYYMM format
		}
		if len(yearMonth) != 6 {
			return c.JSON(http.StatusOK, slack.Msg{Text: "年月の形式が不正です。"})
		}
		year := yearMonth[:4]
		month := yearMonth[4:]
		attendanceLogs, err := h.usecase.GetAttendanceLogListByUserAndMonth(c.Request().Context(), s.TeamID, s.ChannelID, s.UserID, year, month)
		if err != nil {
			fmt.Println("Error: /monthly-hours :", err.Error())
			return c.JSON(http.StatusOK, slack.Msg{Text: "Failed to get attendance log: " + err.Error()})
		}
		if len(attendanceLogs) == 0 {
			message = "出勤記録がありません。"
			return c.JSON(http.StatusOK, slack.Msg{Text: message})
		}

		workplaceName := attendanceLogs[0].WorkplaceID
		message = FormatAttendance(attendanceLogs, workplaceName)
	case "/help-attendance", "/help-attendance-dev":
		message = "以下のコマンドが利用できます。\n" +
			"/start-work: 出勤\n" +
			"/end-work: 退勤\n" +
			"/subscribe-workplace: 職場登録\n" +
			"/monthly-hours: 月間出勤時間\n" +
			"/help-attendance: ヘルプ"
	default:
		message = "不明なコマンドです。"
	}

	return c.JSON(http.StatusOK, slack.Msg{Text: message})
}

func FormatAttendance(logs []domain.AttendanceLog, workplaceName string) string {
	// 1) タイムゾーンつきのレイアウト定義
	const layout = "2006-01-02 15:04:05.999999999 -0700 MST"

	// m=+... を取り除く正規表現
	re := regexp.MustCompile(` m=\+.*$`)

	byDate := make(map[string][]struct {
		t time.Time
		a string
	})

	// 2) 日付文字列 YYYY-MM-DD を key にグルーピング
	for _, e := range logs {
		cleaned := re.ReplaceAllString(e.Timestamp, "")
		t, err := time.Parse(layout, cleaned)
		if err != nil {
			// return "", fmt.Errorf("タイムスタンプの解析失敗: %w", err)
			return "Error: " + err.Error()
		}
		date := t.Format("2006-01-02")
		byDate[date] = append(byDate[date], struct {
			t time.Time
			a string
		}{t: t, a: e.Action})
	}

	// 3) 日付順ソート
	dates := make([]string, 0, len(byDate))
	for d := range byDate {
		dates = append(dates, d)
	}
	sort.Strings(dates)

	var sb strings.Builder
	// ヘッダー
	sb.WriteString(fmt.Sprintf("勤務先: %s\n", workplaceName))
	sb.WriteString("-------------------------------------\n\n")
	sb.WriteString(fmt.Sprintf("%sの勤怠記録\n", time.Now().Format("1月"))) // 例: 「5月の勤怠記録」
	sb.WriteString("-------------------------------------\n\n")

	// 月間合計をあとで出すために累計
	var monthlyTotal float64

	// 4) 各日付ごとに start/end をペアにして表示
	for _, date := range dates {
		events := byDate[date]
		// 時刻順にソート
		sort.Slice(events, func(i, j int) bool {
			return events[i].t.Before(events[j].t)
		})

		// start/end をペアに
		var dayTotal time.Duration
		pairs := make([]struct {
			start, end time.Time
			dur        time.Duration
		}, 0, len(events)/2)

		for i := 0; i < len(events)-1; i++ {
			if events[i].a == "start" && events[i+1].a == "end" {
				d := events[i+1].t.Sub(events[i].t)
				pairs = append(pairs, struct {
					start, end time.Time
					dur        time.Duration
				}{
					start: events[i].t,
					end:   events[i+1].t,
					dur:   d,
				})
				dayTotal += d
				i++ // 次はペアの end をスキップ
			}
		}
		monthlyTotal += dayTotal.Hours()

		// セクション出力
		sb.WriteString(fmt.Sprintf("日付: %s\n", date))
		for _, p := range pairs {
			h := int(p.dur.Hours())
			m := int(p.dur.Minutes()) % 60
			sb.WriteString(fmt.Sprintf("・出勤 %02d:%02d / 退勤 %02d:%02d（%d時間%d分）\n",
				p.start.Hour(), p.start.Minute(),
				p.end.Hour(), p.end.Minute(),
				h, m))
		}
		hTotal := int(dayTotal.Hours())
		mTotal := int(dayTotal.Minutes()) % 60
		sb.WriteString(fmt.Sprintf("合計: %d時間%d分\n", hTotal, mTotal))
		sb.WriteString("-------------------------------------\n\n")
	}

	// 5) 月間合計
	totalH := int(monthlyTotal)
	totalM := int((monthlyTotal - float64(totalH)) * 60)
	sb.WriteString(fmt.Sprintf("月間合計勤務時間: %d時間%d分\n", totalH, totalM))

	return sb.String()
}
