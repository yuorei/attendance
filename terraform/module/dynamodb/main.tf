resource "aws_dynamodb_table" "this" {
  name           = var.table_name
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = var.hash_key
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = var.hash_key
    type = var.hash_key_type
  }

  tags = var.tags
}
