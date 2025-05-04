package port

import (
	"context"
	"time"

	"github.com/yuorei/attendance/src/domain"
)

type AttendanceLogInputPort interface {
	AddAttendanceLogCheckin(ctx context.Context, teamId, channelId, userId, action string) (*domain.AttendanceLog, error)
	AddAttendanceLogCheckout(ctx context.Context, teamId, channelId, userId, action string) (*domain.AttendanceLog, error)
	SubscribeWorkplace(ctx context.Context, teamId, channelId, userId, workplace string) (*domain.WorkplaceBindings, error)
}

type AttendanceLogRepository interface {
	DBAddAttendanceLogCheckin(ctx context.Context, id, teamId, channelId, userId, action string, timestamp time.Time) (*domain.AttendanceLog, error)
	DBAddAttendanceLogCheckout(ctx context.Context, id, teamId, channelId, userId, action string, timestamp time.Time) (*domain.AttendanceLog, error)
	DBSubscribeWorkplace(ctx context.Context, id, teamId, channelId, userId, workplace string, createdAt time.Time) (*domain.WorkplaceBindings, error)
}
