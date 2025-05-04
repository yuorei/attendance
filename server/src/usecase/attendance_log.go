package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yuorei/attendance/src/domain"
	"github.com/yuorei/attendance/src/usecase/port"
)

type AttendanceLogUseCase struct {
	attendanceLogRepository port.AttendanceLogRepository
}

func NewAttendanceLogRepository(attendanceLogRepository port.AttendanceLogRepository) *AttendanceLogUseCase {
	return &AttendanceLogUseCase{
		attendanceLogRepository: attendanceLogRepository,
	}
}

func (r *Repository) AddAttendanceLogStart(ctx context.Context, teamId, channelId, userId, action string) (*domain.AttendanceLog, error) {
	u, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	result, err := r.attendanceLogRepository.attendanceLogRepository.DBAddAttendanceLogStart(ctx, u.String(), teamId, channelId, userId, action, time.Now())
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (r *Repository) AddAttendanceLogEnd(ctx context.Context, teamId, channelId, userId, action string) (*domain.AttendanceLog, error) {
	u, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	result, err := r.attendanceLogRepository.attendanceLogRepository.DBAddAttendanceLogEnd(ctx, u.String(), teamId, channelId, userId, action, time.Now())
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (r *Repository) SubscribeWorkplace(ctx context.Context, teamId, channelId, userId, workplace string) (*domain.WorkplaceBindings, error) {
	u, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	result, err := r.attendanceLogRepository.attendanceLogRepository.DBSubscribeWorkplace(ctx, u.String(), teamId, channelId, userId, workplace, time.Now())
	if err != nil {
		return nil, err
	}

	return result, nil
}
