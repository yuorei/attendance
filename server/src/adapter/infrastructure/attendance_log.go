package infrastructure

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/yuorei/attendance/src/domain"
)

const (
	tableWorkplaceBindings  = "WorkplaceBindings"
	tableAttendanceLog      = "AttendanceLog"
	indexCompositeKey       = "CompositeKey-index"
	indexWorkplaceTimestamp = "gsi_workplace_timestamp"
)

func (i *Infrastructure) getWorkplaceBinding(ctx context.Context, teamID, channelID, userID string) (*domain.WorkplaceBindings, error) {
	compositeKey := fmt.Sprintf("%s#%s#%s", teamID, channelID, userID)
	input := &dynamodb.QueryInput{
		TableName:              aws.String(tableWorkplaceBindings),
		IndexName:              aws.String(indexCompositeKey),
		KeyConditionExpression: aws.String("composite_key = :compositeKey"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":compositeKey": &types.AttributeValueMemberS{Value: compositeKey},
		},
		Limit: aws.Int32(1),
	}
	output, err := i.db.Database.Query(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to get WorkplaceBinding: %w", err)
	}
	if len(output.Items) == 0 {
		return nil, fmt.Errorf("WorkplaceBinding not found")
	}
	var binding domain.WorkplaceBindings
	if err := attributevalue.UnmarshalMap(output.Items[0], &binding); err != nil {
		return nil, fmt.Errorf("failed to unmarshal WorkplaceBinding: %w", err)
	}

	return &binding, nil
}

func (i *Infrastructure) getLatestAttendanceLog(ctx context.Context, workplaceID string) (*domain.AttendanceLog, error) {
	input := &dynamodb.QueryInput{
		TableName:              aws.String(tableAttendanceLog),
		IndexName:              aws.String(indexWorkplaceTimestamp),
		KeyConditionExpression: aws.String("workplace_id = :wpid"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":wpid": &types.AttributeValueMemberS{Value: workplaceID},
		},
		ScanIndexForward: aws.Bool(false),
		Limit:            aws.Int32(1),
	}
	output, err := i.db.Database.Query(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to get latest AttendanceLog: %w", err)
	}
	var logs []domain.AttendanceLog
	if err := attributevalue.UnmarshalListOfMaps(output.Items, &logs); err != nil {
		return nil, fmt.Errorf("failed to unmarshal AttendanceLog: %w", err)
	}
	if len(logs) > 0 {
		return &logs[0], nil
	}

	return nil, nil
}

func (i *Infrastructure) putAttendanceLog(ctx context.Context, log *domain.AttendanceLog) error {
	item, err := attributevalue.MarshalMap(log)
	if err != nil {
		return fmt.Errorf("failed to marshal AttendanceLog: %w", err)
	}
	_, err = i.db.Database.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(tableAttendanceLog),
		Item:      item,
	})
	if err != nil {
		return fmt.Errorf("failed to save AttendanceLog: %w", err)
	}

	return nil
}

func (i *Infrastructure) DBAddAttendanceLogCheckin(ctx context.Context, id, teamID, channelID, userID, action string, timestamp time.Time) (*domain.AttendanceLog, error) {
	binding, err := i.getWorkplaceBinding(ctx, teamID, channelID, userID)
	if err != nil {
		return nil, err
	}
	latestLog, err := i.getLatestAttendanceLog(ctx, binding.ID)
	if err != nil {
		return nil, err
	}
	if latestLog != nil && latestLog.Action == "checkin" {
		return nil, fmt.Errorf("already checked in")
	}
	newLog := &domain.AttendanceLog{
		ID:          id,
		TeamID:      teamID,
		UserID:      binding.UserId,
		Timestamp:   timestamp,
		Action:      action,
		ChannelID:   binding.CannelId,
		WorkplaceID: binding.ID,
	}
	if err := i.putAttendanceLog(ctx, newLog); err != nil {
		return nil, err
	}

	// TODO: WorkplaceIDに職場名を入れているのでこの実装方法を直す
	newLog.WorkplaceID = binding.Workplace

	return newLog, nil
}

func (i *Infrastructure) DBAddAttendanceLogCheckout(ctx context.Context, id, teamID, channelID, userID, action string, timestamp time.Time) (*domain.AttendanceLog, error) {
	binding, err := i.getWorkplaceBinding(ctx, teamID, channelID, userID)
	if err != nil {
		return nil, err
	}
	latestLog, err := i.getLatestAttendanceLog(ctx, binding.ID)
	if err != nil {
		return nil, err
	}
	if latestLog == nil {
		return nil, fmt.Errorf("no checkin log found")
	}
	if latestLog.Action == "checkout" {
		return nil, fmt.Errorf("already checked out")
	}

	newLog := &domain.AttendanceLog{
		ID:          id,
		TeamID:      teamID,
		UserID:      binding.UserId,
		Timestamp:   timestamp,
		Action:      action,
		ChannelID:   binding.CannelId,
		WorkplaceID: binding.ID,
	}
	if err := i.putAttendanceLog(ctx, newLog); err != nil {
		return nil, err
	}

	// TODO: WorkplaceIDに職場名を入れているのでこの実装方法を直す
	newLog.WorkplaceID = binding.Workplace

	return newLog, nil
}

func (i *Infrastructure) DBGetAttendanceLog(ctx context.Context, id string) (*domain.AttendanceLog, error) {
	output, err := i.db.Database.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(tableAttendanceLog),
		Key: map[string]types.AttributeValue{
			"id": &types.AttributeValueMemberS{Value: id},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get AttendanceLog: %w", err)
	}

	var log domain.AttendanceLog
	if err := attributevalue.UnmarshalMap(output.Item, &log); err != nil {
		return nil, fmt.Errorf("failed to unmarshal AttendanceLog: %w", err)
	}

	return &log, nil
}

func (i *Infrastructure) DBSubscribeWorkplace(ctx context.Context, id, teamID, channelID, userID, workplace string, createdAt time.Time) (*domain.WorkplaceBindings, error) {
	workplaceBinding, err := i.getWorkplaceBinding(ctx, teamID, channelID, userID)
	if err != nil && err.Error() != "WorkplaceBinding not found" {
		return nil, fmt.Errorf("failed to get WorkplaceBinding: %w", err)
	}

	if workplaceBinding != nil {
		return nil, fmt.Errorf("already subscribed to workplace")
	}

	newBinding := domain.WorkplaceBindings{
		ID:           id,
		TeamId:       teamID,
		CannelId:     channelID,
		UserId:       userID,
		Workplace:    workplace,
		CreatedAt:    createdAt,
		UpdatedAt:    createdAt,
		DeletedAt:    nil,
		CompositeKey: fmt.Sprintf("%s#%s#%s", teamID, channelID, userID),
	}

	item, err := attributevalue.MarshalMap(newBinding)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal WorkplaceBinding: %w", err)
	}
	_, err = i.db.Database.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(tableWorkplaceBindings),
		Item:      item,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to save WorkplaceBinding: %w", err)
	}

	return &newBinding, nil
}
