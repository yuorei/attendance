# AWSアカウントIDを取得（DynamoDBリソース指定用）
data "aws_caller_identity" "current" {}

# LambdaにアタッチするIAMロール作成
resource "aws_iam_role" "lambda_exec" {
  name               = "${var.function_name}-role"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

# IAMロールのAssumeRoleポリシードキュメント
data "aws_iam_policy_document" "assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# Lambda関数本体
resource "aws_lambda_function" "this" {
  function_name    = var.function_name
  handler          = var.handler
  runtime          = var.runtime
  role             = aws_iam_role.lambda_exec.arn
  filename         = var.filename
  source_code_hash = filebase64sha256(var.filename)

  environment {
    variables = var.environment_variables
  }

  tags = var.tags
}

# CloudWatchロググループ（Lambdaのログ保存先）
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${aws_lambda_function.this.function_name}"
  retention_in_days = 14
}

# LambdaがCloudWatchログ出力できるための基本ポリシー付与
resource "aws_iam_role_policy_attachment" "basic_logging" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDBストリーム → Lambdaのイベントマッピング
resource "aws_lambda_event_source_mapping" "dynamodb" {
  event_source_arn  = var.dynamodb_stream_arn
  function_name     = aws_lambda_function.this.arn
  starting_position = "LATEST"
}

# DynamoDBストリーム読み取り権限ポリシー
data "aws_iam_policy_document" "stream_access" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetRecords",
      "dynamodb:GetShardIterator",
      "dynamodb:DescribeStream",
      "dynamodb:ListStreams"
    ]
    resources = [var.dynamodb_stream_arn]
  }
}

resource "aws_iam_policy" "dynamodb_stream_access" {
  name   = "${var.function_name}-ddb-stream-access"
  policy = data.aws_iam_policy_document.stream_access.json
}

# 上記のストリーム権限をIAMロールにアタッチ
resource "aws_iam_role_policy_attachment" "stream_access" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.dynamodb_stream_access.arn
}

# DynamoDB PutItem/UpdateItem 書き込み権限ポリシー
data "aws_iam_policy_document" "dynamodb_write_access" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:Query",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem"
    ]
    resources = [
      "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${var.table_name}",
      "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${var.table_name}/index/gsi_workplace_timestamp",
      "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${var.table_name2}/index/CompositeKey-index",
      "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${var.table_name2}"
    ]
  }
}

resource "aws_iam_policy" "dynamodb_access" {
  name   = "${var.function_name}-ddb-write-access"
  policy = data.aws_iam_policy_document.dynamodb_write_access.json
}

# 上記の書き込み権限をIAMロールにアタッチ
resource "aws_iam_role_policy_attachment" "dynamodb_write_access" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.dynamodb_access.arn
}
