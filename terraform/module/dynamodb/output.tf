output "table_name" {
  description = "DynamoDBテーブルの名前"
  value       = aws_dynamodb_table.this.name
}

output "table_name2" {
  description = "DynamoDBテーブルの名前2"
  value       = aws_dynamodb_table.workplace_bindings.name
}

output "stream_arn" {
  description = "DynamoDBストリームのARN"
  value       = aws_dynamodb_table.this.stream_arn
}
