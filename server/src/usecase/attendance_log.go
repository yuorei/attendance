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

	jst, _ := time.LoadLocation("Asia/Tokyo")
	now := time.Now().In(jst)
	result, err := r.attendanceLogRepository.attendanceLogRepository.DBAddAttendanceLogStart(ctx, u.String(), teamId, channelId, userId, action, now)
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

	jst, _ := time.LoadLocation("Asia/Tokyo")
	now := time.Now().In(jst)
	result, err := r.attendanceLogRepository.attendanceLogRepository.DBAddAttendanceLogEnd(ctx, u.String(), teamId, channelId, userId, action, now)
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

	jst, _ := time.LoadLocation("Asia/Tokyo")
	now := time.Now().In(jst)
	result, err := r.attendanceLogRepository.attendanceLogRepository.DBSubscribeWorkplace(ctx, u.String(), teamId, channelId, userId, workplace, now)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (r *Repository) GetAttendanceLogListByUserAndMonth(ctx context.Context, teamId, channelId, userId, year, month string) ([]domain.AttendanceLog, error) {
	result, err := r.attendanceLogRepository.attendanceLogRepository.DBGetAttendanceLogListByUserAndMonth(ctx, teamId, channelId, userId, year, month)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (r *Repository) UpdateAttendanceLog(ctx context.Context, id string, newTimestamp time.Time) (*domain.AttendanceLog, error) {
	result, err := r.attendanceLogRepository.DBUpdateAttendanceLog(ctx, id, newTimestamp)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (r *Repository) DeleteAttendanceLog(ctx context.Context, id string) error {
	err := r.attendanceLogRepository.attendanceLogRepository.DBDeleteAttendanceLog(ctx, id)
	if err != nil {
		return err
	}

	return nil
}
