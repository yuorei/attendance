variable "table_name" {
  description = "DynamoDBテーブルの名前"
  type        = string
}

variable "hash_key" {
  description = "ハッシュキーの名前"
  type        = string
}

variable "hash_key_type" {
  description = "ハッシュキーのタイプ（S, N, B）"
  type        = string
}

variable "tags" {
  description = "リソースに適用するタグ"
  type        = map(string)
  default     = {}
}
