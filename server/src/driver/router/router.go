package router

import (
	"os"

	echoadapter "github.com/awslabs/aws-lambda-go-api-proxy/echo"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/yuorei/attendance/src/adapter/infrastructure"
	"github.com/yuorei/attendance/src/adapter/presentation"
	"github.com/yuorei/attendance/src/usecase"
)

func NewRouter() *echoadapter.EchoLambda {
	infra := infrastructure.NewInfrastructure()
	repository := usecase.NewRepository(infra)

	handler := presentation.NewHandler(repository)

	e := echo.New()
	e.Use(middleware.Recover())

	e.GET("/health", handler.HealthCheck)
	e.GET("/attendance/:workplace_id/:year/:month", handler.AttendanceLogListByUserAndMonth)
	e.POST("/slack/slash/attendance", handler.AttendanceSlach)

	if os.Getenv("ENV") == "local" {
		e.Logger.Fatal(e.Start(":8080"))
	}

	echoLambda := echoadapter.New(e)
	return echoLambda
}
