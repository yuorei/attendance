variable "region" {
  description = "The AWS region for the resources."
  type        = string
  default     = "ap-northeast-1"
}
variable "lambda_arn" { type = string }
variable "tags" { type = map(string) }
variable "stage_name" {
  description = "Lambda function name"
  type        = string
}

variable "lambda_name" {
  type = string
}

variable "lambda_invoke_arn" {
  type = string
}

variable "env" {
  type = string
}
