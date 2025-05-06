resource "aws_dynamodb_table" "this" {
  name             = "${var.table_name}-${var.env}"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = var.hash_key
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = var.hash_key
    type = var.hash_key_type
  }

  # GSI用の属性定義
  attribute {
    name = "workplace_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S" # あるいは "N"（時刻をUnix秒などで持つ場合）
  }

  global_secondary_index {
    name            = "gsi_workplace_timestamp"
    hash_key        = "workplace_id"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  tags = var.tags
}


resource "aws_dynamodb_table" "workplace_bindings" {
  name             = "WorkplaceBindings-${var.env}"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "id" # 主キーは id
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  # 主キー定義
  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "composite_key"
    type = "S"
  }

  # GSI定義（team_id, channel_id, user_id の複合キー）
  global_secondary_index {
    name            = "CompositeKey-index"
    hash_key        = "composite_key"
    projection_type = "ALL"
  }

  tags = var.tags
}
