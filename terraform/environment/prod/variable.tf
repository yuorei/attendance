variable "aws_region" {
  type    = string
  default = "ap-northeast-1"
}

variable "table_name" {
  type    = string
  default = "my-table-prod"
}

variable "hash_key" {
  type    = string
  default = "id"
}

variable "hash_key_type" {
  type    = string
  default = "S"
}

variable "lambda_function_name" {
  type    = string
  default = "my-lambda-prod"
}

variable "lambda_handler" {
  type    = string
  default = "index.handler"
}

variable "lambda_runtime" {
  type    = string
  default = "nodejs14.x"
}

variable "lambda_role_arn" {
  type = string
}

variable "lambda_filename" {
  type = string
}

variable "lambda_environment_variables" {
  type    = map(string)
  default = {}
}

variable "tags" {
  type    = map(string)
  default = {
    Environment = "prod"
    Project     = "example"
  }
}
