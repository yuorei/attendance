package usecase

import (
	"github.com/yuorei/attendance/src/adapter/infrastructure"
	"github.com/yuorei/attendance/src/usecase/port"
)

type UseCase struct {
	port.AttendanceLogInputPort
}

type Repository struct {
	attendanceLogRepository *AttendanceLogUseCase
}

func NewUseCase(repository *Repository) *UseCase {
	return &UseCase{
		AttendanceLogInputPort: repository,
	}
}

func NewRepository(infra *infrastructure.Infrastructure) *Repository {
	attendanceLog := NewAttendanceLogRepository(infra)
	return &Repository{
		attendanceLogRepository: attendanceLog,
	}
}
