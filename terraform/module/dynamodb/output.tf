output "table_name" {
  description = "DynamoDBテーブルの名前"
  value       = aws_dynamodb_table.this.name
}

output "stream_arn" {
  description = "DynamoDBストリームのARN"
  value       = aws_dynamodb_table.this.stream_arn
}
