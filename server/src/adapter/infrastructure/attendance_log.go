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

func (i *Infrastructure) DBAddAttendanceLogStart(ctx context.Context, id, teamID, channelID, userID, action string, timestamp time.Time) (*domain.AttendanceLog, error) {
	binding, err := i.getWorkplaceBinding(ctx, teamID, channelID, userID)
	if err != nil {
		return nil, err
	}
	latestLog, err := i.getLatestAttendanceLog(ctx, binding.ID)
	if err != nil {
		return nil, err
	}
	if latestLog != nil && latestLog.Action == "start" {
		return nil, fmt.Errorf("already checked in")
	}
	newLog := &domain.AttendanceLog{
		ID:          id,
		TeamID:      teamID,
		UserID:      binding.UserId,
		Timestamp:   timestamp.String(),
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

func (i *Infrastructure) DBAddAttendanceLogEnd(ctx context.Context, id, teamID, channelID, userID, action string, timestamp time.Time) (*domain.AttendanceLog, error) {
	binding, err := i.getWorkplaceBinding(ctx, teamID, channelID, userID)
	if err != nil {
		return nil, err
	}
	latestLog, err := i.getLatestAttendanceLog(ctx, binding.ID)
	if err != nil {
		return nil, err
	}
	if latestLog == nil {
		return nil, fmt.Errorf("no start log found")
	}
	if latestLog.Action == "end" {
		return nil, fmt.Errorf("already checked out")
	}

	newLog := &domain.AttendanceLog{
		ID:          id,
		TeamID:      teamID,
		UserID:      binding.UserId,
		Timestamp:   timestamp.String(),
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

func (i *Infrastructure) DBGetAttendanceLogListByUserAndMonth(ctx context.Context, workplaceId, userId, year, month string) ([]domain.AttendanceLog, error) {
	yearMonth := fmt.Sprintf("%s-%s", year, month) // 例: "2025-05"

	// プレースホルダー #ts を定義し、実際の属性名 "timestamp" にマッピング
	expressionAttributeNames := map[string]string{
		"#ts": "timestamp",
	}

	// プレースホルダー :workplaceId と :yearMonth の値を定義
	expressionAttributeValues := map[string]types.AttributeValue{
		":workplaceId": &types.AttributeValueMemberS{Value: workplaceId},
		":yearMonth":   &types.AttributeValueMemberS{Value: yearMonth},
	}

	input := &dynamodb.QueryInput{
		TableName: aws.String(tableAttendanceLog),
		// GSI名を指定
		IndexName: aws.String(indexWorkplaceTimestamp),
		// KeyConditionExpression でプレースホルダー #ts を使用
		KeyConditionExpression: aws.String("workplace_id = :workplaceId and begins_with(#ts, :yearMonth)"),
		// ExpressionAttributeNames を追加
		ExpressionAttributeNames: expressionAttributeNames,
		// ExpressionAttributeValues は変更なし
		ExpressionAttributeValues: expressionAttributeValues,
		// userIdでフィルタリングする場合はFilterExpressionを追加 (GSIに含まれていない属性でのフィルタ)
		// FilterExpression: aws.String("user_id = :userId"),
		// ExpressionAttributeValues[":userId"] = &types.AttributeValueMemberS{Value: userId},
		// 注意: FilterExpressionはQueryの後に行われるため、大量のデータを読み込んだ後にフィルタリングすることになり、
		//       コスト効率が悪くなる可能性があります。可能であればGSIのキー設計を見直すか、
		//       別の方法（例：複合ソートキー user_id#timestamp など）を検討してください。
	}

	output, err := i.db.Database.Query(ctx, input)
	if err != nil {
		// エラー内容をより詳細に出力するとデバッグに役立ちます
		// log.Printf("DynamoDB Query Error: %v, RequestInput: %+v", err, input)
		return nil, fmt.Errorf("failed to get AttendanceLogListByUserAndMonth from GSI %s: %w", indexWorkplaceTimestamp, err)
	}

	var logs []domain.AttendanceLog
	if err := attributevalue.UnmarshalListOfMaps(output.Items, &logs); err != nil {
		return nil, fmt.Errorf("failed to unmarshal AttendanceLogListByUserAndMonth: %w", err)
	}

	// GSIにはuser_idが含まれている (projection_type = "ALL" のため) ので、
	// 必要であればここでさらにGo側でuserIdによるフィルタリングを行うこともできますが、
	// FilterExpressionを使う方が一般的です。
	// もしFilterExpressionを使わない場合:
	// filteredLogs := []AttendanceLog{}
	// for _, log := range logs {
	// 	if log.UserID == userId {
	// 		filteredLogs = append(filteredLogs, log)
	// 	}
	// }
	// return filteredLogs, nil

	return logs, nil
}
