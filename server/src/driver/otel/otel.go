package otel

import (
	"context"
	"fmt"
	"os"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
)

func InitTracer(ctx context.Context) (*sdktrace.TracerProvider, error) {
	otelEndpoint := os.Getenv("OTEL_ENDPOINT")
	if otelEndpoint == "" {
		return nil, fmt.Errorf("OTEL_ENDPOINT is not set")
	}

	otelTolent := os.Getenv("OTEL_TOKEN")

	// OTLP HTTPエクスポーター作成（Bearer Token 認証付き）
	exporter, err := otlptracehttp.New(ctx,
		otlptracehttp.WithEndpoint(otelEndpoint),
		otlptracehttp.WithHeaders(map[string]string{
			"Authorization": fmt.Sprintf("Bearer %s", otelTolent),
		}),
	)
	if err != nil {
		return nil, err
	}

	otelServiceName := os.Getenv("OTEL_SERVICE_NAME")
	env := os.Getenv("ENV")

	// トレーサープロバイダー構築
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceNameKey.String(fmt.Sprintf("%s-%s", otelServiceName, env)),
		)),
	)

	otel.SetTracerProvider(tp)
	return tp, nil
}
