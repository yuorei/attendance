# terraform {
#   required_version = ">= 1.8.0"
#   required_providers {
#     aws = {
#       source  = "hashicorp/aws"
#       version = "~> 5.50"
#     }
#   }
# }

provider "aws" {
  region = var.aws_region
}

module "dynamodb" {
  source        = "../../module/dynamodb"
  table_name    = var.table_name
  hash_key      = "id"
  hash_key_type = "S"
  tags          = var.tags
  env           = var.env
}

module "lambda" {
  source        = "../../module/lambda"
  function_name = "${var.lambda_function_name}-${var.env}"
  handler       = "bootstrap"
  runtime       = "provided.al2023"
  filename      = var.lambda_zip_path # 先に zip 済みバイナリを配置
  environment_variables = {
    TABLE_NAME        = module.dynamodb.table_name
    OTEL_ENDPOINT     = var.otel_endpoint
    OTEL_TOKEN        = var.otel_token
    OTEL_SERVICE_NAME = "${var.lambda_function_name}-${var.env}"
    ENV               = var.env
  }
  dynamodb_stream_arn = module.dynamodb.stream_arn
  tags                = var.tags
  table_name          = module.dynamodb.table_name
  table_name2         = module.dynamodb.table_name2
  aws_region          = var.aws_region
}

module "apigateway" {
  source            = "../../module/apigateway"
  lambda_arn        = module.lambda.arn
  tags              = var.tags
  stage_name        = var.env
  lambda_name       = module.lambda.function_name
  lambda_invoke_arn = module.lambda.invoke_arn
  env               = var.env
}
