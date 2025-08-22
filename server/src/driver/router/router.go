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

	// TODO: lambdaを使うと何故かトレースされない。
	// ctx := context.Background()
	// トレーサー初期化
	// tp, err := otel.InitTracer(ctx)
	// if err != nil {
	// 	log.Fatalf("failed to initialize tracer: %v", err)
	// }
	// defer func() {
	// 	if err := tp.Shutdown(ctx); err != nil {
	// 		log.Fatalf("failed to shutdown tracer: %v", err)
	// 	}
	// }()

	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// OpenTelemetry Echoミドルウェア
	// otelServiceName := os.Getenv("OTEL_SERVICE_NAME")
	// env := os.Getenv("ENV")
	// e.Use(otelecho.Middleware(fmt.Sprintf("%s-%s", otelServiceName, env)))

	e.GET("/health", handler.HealthCheck)
	// e.GET("/attendance/:workplace_id/:year/:month", handler.AttendanceLogListByUserAndMonth)
	e.POST("/slack/slash/attendance", handler.AttendanceSlach)

	// Slack OAuth endpoints
	e.GET("/auth/slack", handler.SlackOAuthLogin)
	e.GET("/auth/slack/callback", handler.SlackOAuthCallback)
	e.GET("/api/v1/slack/channels", handler.GetSlackChannels)

	// REST API endpoints that mirror Slack functionality
	api := e.Group("/api/v1")
	api.POST("/attendance/check-in", handler.CheckIn)
	api.POST("/attendance/check-out", handler.CheckOut)
	api.POST("/attendance/workplace/subscribe", handler.SubscribeWorkplace)
	api.GET("/attendance/monthly", handler.GetMonthlyHours)
	api.PUT("/attendance/edit", handler.EditAttendance)
	api.DELETE("/attendance/:id", handler.DeleteAttendance)

	if os.Getenv("ENV") == "local" {
		e.Logger.Fatal(e.Start(":8080"))
	}

	echoLambda := echoadapter.New(e)
	return echoLambda
}
