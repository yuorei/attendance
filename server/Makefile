.PHONY: up db_init db_list req

up:
	docker compose up

fmt:
	gofmt -s -l -w .
	go mod tidy

db_init:
	aws dynamodb create-table \
		--table-name Attendance \
		--attribute-definitions \
			AttributeName=UserID,AttributeType=S \
			AttributeName=Timestamp,AttributeType=S \
		--key-schema \
			AttributeName=UserID,KeyType=HASH \
			AttributeName=Timestamp,KeyType=RANGE \
		--provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
		--endpoint-url http://localhost:8000 \
		--region us-west-2

db_list:
	aws dynamodb list-tables \
		--endpoint-url http://localhost:8000 \
		--region us-west-2

req:
	curl -X POST http://localhost:8080/slack/events \
		-H 'Content-Type: application/json' \
		-d '{
		"type": "event_callback",
		"event": {
			"type": "message",
			"user": "U12345678",
			"text": "Hello World",
			"channel": "C12345678",
			"ts": "1234567890.123456"
		}
		}'

dev:
	ENV=local go run main.go 