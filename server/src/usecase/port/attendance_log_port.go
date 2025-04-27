package port

import (
	"context"

	"github.com/yuorei/attendance/src/domain"
)

type AttendanceLogInputPort interface {
	AddAttendanceLog(ctx context.Context, campaignID string) (*domain.AttendanceLog, error)
}

type AttendanceLogRepository interface {
	DBAddAttendanceLog(ctx context.Context, campaignID string) (*domain.AttendanceLog, error)
}
