variable "function_name" { type = string }
variable "handler" { type = string }
variable "runtime" { type = string }
variable "filename" { type = string }
variable "environment_variables" { type = map(string) }
variable "dynamodb_stream_arn" { type = string }
variable "tags" { type = map(string) }
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "table_name" {
  description = "DynamoDB table name"
  type        = string
}

variable "table_name2" {
  description = "DynamoDB table name"
  type        = string
}
