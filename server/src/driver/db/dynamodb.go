package db

import (
	"context"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

type DB struct {
	Database *dynamodb.Client
}

func NewDBClient() *DB {
	var cfg aws.Config
	var err error
	if os.Getenv("ENV") == "local" {
		cfg, err = config.LoadDefaultConfig(context.TODO(),
			config.WithRegion("us-west-2"),

			config.WithEndpointResolver(aws.EndpointResolverFunc(
				func(service, region string) (aws.Endpoint, error) {
					return aws.Endpoint{
						URL:           "http://localhost:8000",
						SigningRegion: "us-west-2",
					}, nil
				})),
			config.WithCredentialsProvider(credentials.StaticCredentialsProvider{
				Value: aws.Credentials{
					AccessKeyID:     "dummy",
					SecretAccessKey: "dummy",
					SessionToken:    "dummy",
					Source:          "Hard-coded credentials; values are irrelevant for local DynamoDB",
				},
			}),
		)

	} else { // 本番環境
		cfg, err = config.LoadDefaultConfig(context.TODO(), config.WithRegion("ap-northeast-1"))
	}

	if err != nil {
		log.Fatalf("SDK の設定読み込みに失敗しました: %v", err)
	}

	dynamoClient := dynamodb.NewFromConfig(cfg)
	return &DB{
		Database: dynamoClient,
	}
}
