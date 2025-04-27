package usecase

import (
	"context"

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

func (r *Repository) AddAttendanceLog(ctx context.Context, campaignID string) (*domain.AttendanceLog, error) {
	u, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	result, err := r.attendanceLogRepository.attendanceLogRepository.DBAddAttendanceLog(ctx, u.String())
	if err != nil {
		return nil, err
	}

	return result, nil
}
