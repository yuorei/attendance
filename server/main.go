package main

import (
	"context"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/yuorei/attendance/src/driver/router"
)

func main() {
	echoLambda := router.NewRouter()

	lambda.Start(func(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		return echoLambda.ProxyWithContext(ctx, req)
	})
}
