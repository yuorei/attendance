provider "aws" {
  region = var.aws_region
}

module "dynamodb" {
  source        = "../../module/dynamodb"
  table_name    = var.table_name
  hash_key      = var.hash_key
  hash_key_type = var.hash_key_type
  tags          = var.tags
}

module "lambda" {
  source                = "../../module/lambda"
  function_name         = var.lambda_function_name
  handler               = var.lambda_handler
  runtime               = var.lambda_runtime
  role_arn              = var.lambda_role_arn
  filename              = var.lambda_filename
  environment_variables = var.lambda_environment_variables
  dynamodb_stream_arn   = module.dynamodb.stream_arn
  tags                  = var.tags
}
