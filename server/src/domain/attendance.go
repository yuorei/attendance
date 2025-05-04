package domain

import "time"

type AttendanceLog struct {
	ID          string    `dynamodbav:"id"`
	TeamID      string    `dynamodbav:"team_id"`
	UserID      string    `dynamodbav:"user_id"`
	Timestamp   time.Time `dynamodbav:"timestamp"`
	Action      string    `dynamodbav:"action"`
	ChannelID   string    `dynamodbav:"channel_id"`
	WorkplaceID string    `dynamodbav:"workplace_id"`
}

type WorkplaceBindings struct {
	ID           string     `dynamodbav:"id"`
	TeamId       string     `dynamodbav:"team_id"`
	CannelId     string     `dynamodbav:"channel_id"`
	UserId       string     `dynamodbav:"user_id"`
	Workplace    string     `dynamodbav:"workplace"`
	CreatedAt    time.Time  `dynamodbav:"created_at"`
	UpdatedAt    time.Time  `dynamodbav:"updated_at"`
	DeletedAt    *time.Time `dynamodbav:"deleted_at"`
	CompositeKey string     `dynamodbav:"composite_key"`
}
