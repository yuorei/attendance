variable "aws_region" {
  description = "AWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "env" {
  description = "環境名"
  type        = string
  default     = "prod"
}

variable "table_name" {
  description = "DynamoDBテーブルの名前"
  type        = string
  default     = "AttendanceLog"
}

variable "table_name2" {
  description = "DynamoDBテーブルの名前2"
  type        = string
  default     = "WorkplaceBindings"
}

variable "hash_key" {
  description = "DynamoDBのハッシュキー"
  type        = string
  default     = "id"
}

variable "hash_key_type" {
  description = "ハッシュキーのタイプ（S, N, B）"
  type        = string
  default     = "S"
}

variable "lambda_function_name" {
  description = "Lambda関数の名前"
  type        = string
  default     = "attendance-api-server"
}

variable "lambda_handler" {
  description = "Lambda関数のハンドラー"
  type        = string
  default     = "bootstrap"
}

variable "lambda_runtime" {
  description = "Lambda関数のランタイム"
  type        = string
  default     = "provided.al2023"
}

# variable "lambda_role_arn" {
#   description = "Lambda関数に付与するIAMロールのARN"
#   type        = string
# }

variable "lambda_zip_path" {
  description = "Lambda関数のZIPパッケージパス"
  type        = string
  default     = "./bootstrap.zip"
}

variable "lambda_environment_variables" {
  description = "Lambda関数の環境変数"
  type        = map(string)
  default = {
    ENV = "prod"
  }
}

variable "otel_endpoint" {
  type        = string
  description = "OpenTelemetryのエンドポイント"
}

variable "otel_token" {
  type        = string
  description = "OpenTelemetryのトークン"
}

variable "slack_client_id" {
  type        = string
  description = "Slack OAuth Client ID"
  sensitive   = true
}

variable "slack_client_secret" {
  type        = string
  description = "Slack OAuth Client Secret"
  sensitive   = true
}

variable "slack_redirect_uri" {
  type        = string
  description = "Slack OAuth Redirect URI"
  default     = ""
}

variable "tags" {
  description = "共通のタグ"
  type        = map(string)
  default = {
    Environment = "prod"
    Project     = "attendance-api-server"
  }
}

