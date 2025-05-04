package port

import (
	"context"
	"time"

	"github.com/yuorei/attendance/src/domain"
)

type AttendanceLogInputPort interface {
	AddAttendanceLogStart(ctx context.Context, teamId, channelId, userId, action string) (*domain.AttendanceLog, error)
	AddAttendanceLogEnd(ctx context.Context, teamId, channelId, userId, action string) (*domain.AttendanceLog, error)
	SubscribeWorkplace(ctx context.Context, teamId, channelId, userId, workplace string) (*domain.WorkplaceBindings, error)
}

type AttendanceLogRepository interface {
	DBAddAttendanceLogStart(ctx context.Context, id, teamId, channelId, userId, action string, timestamp time.Time) (*domain.AttendanceLog, error)
	DBAddAttendanceLogEnd(ctx context.Context, id, teamId, channelId, userId, action string, timestamp time.Time) (*domain.AttendanceLog, error)
	DBSubscribeWorkplace(ctx context.Context, id, teamId, channelId, userId, workplace string, createdAt time.Time) (*domain.WorkplaceBindings, error)
}
