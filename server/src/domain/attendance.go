package domain

import "time"

// DynamoDBに保存するレコード
// type AttendanceRecord struct {
// 	UserID    string `json:"user_id"`    // パーティションキー
// 	Timestamp string `json:"timestamp"`  // ソートキー
// 	EventType string `json:"event_type"` // 出勤などの種類
// }

type AttendanceLog struct {
	ID          string    `dynamodbav:"id"`           // PartitionKey：必須
	UserID      string    `dynamodbav:"user_id"`      // PartitionKey：必須
	Timestamp   time.Time `dynamodbav:"timestamp"`    // アクション発生時刻（SortKey）
	Action      string    `dynamodbav:"action"`       // 任意
	ChannelID   string    `dynamodbav:"channel_id"`   // 任意
	WorkplaceID string    `dynamodbav:"workplace_id"` // 任意
}
