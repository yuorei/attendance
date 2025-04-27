package infrastructure

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/yuorei/attendance/src/domain"
)

// putMovie は映画の情報を DynamoDB に追加します。
func (i *Infrastructure) DBAddAttendanceLog(ctx context.Context, id string) (*domain.AttendanceLog, error) {
	addAttendanceLog := domain.AttendanceLog{
		ID:          id,
		UserID:      "example-user-id",      // Replace with actual user ID
		Timestamp:   time.Now(),             // Replace with actual timestamp
		Action:      "example-action",       // Replace with actual action
		ChannelID:   "example-channel-id",   // Replace with actual channel ID
		WorkplaceID: "example-workplace-id", // Replace with actual workplace ID
	}
	item, err := attributevalue.MarshalMap(addAttendanceLog)
	if err != nil {
		return nil, fmt.Errorf("マッピングに失敗しました: %w", err)
	}
	tableName := "AttendanceLog" // DynamoDB のテーブル名を指定してください
	_, err = i.db.Database.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: &tableName,
		Item:      item,
	})
	if err != nil {
		return nil, fmt.Errorf("PutItem に失敗しました: %w", err)
	}

	return nil, nil
}
