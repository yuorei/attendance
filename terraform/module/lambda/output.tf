output "invoke_arn" {
  description = "Invoke ARN of the Lambda function"
  value       = aws_lambda_function.this.invoke_arn
}

output "arn" {
  description = "Lambda ARN (resource ARN)"
  value       = aws_lambda_function.this.arn
}

output "log_group_name" {
  description = "CloudWatch log group for the Lambda"
  value       = aws_cloudwatch_log_group.lambda.name
}
output "function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.this.function_name
}
