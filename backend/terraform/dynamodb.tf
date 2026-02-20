resource "aws_dynamodb_table" "links" {
  name         = "qaktus-links"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "short_code"

  attribute {
    name = "short_code"
    type = "S"
  }
}
