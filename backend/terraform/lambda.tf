data "aws_caller_identity" "current" {}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.root}/../lambda/generate_link.py"
  output_path = "${path.root}/../lambda/generate_link.zip"
}

resource "aws_iam_role" "lambda_exec" {
  name = "qaktus-lambda-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "generate_link" {
  function_name    = "qaktus-generate-link"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "python3.12"
  handler          = "generate_link.handler"
  role             = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.links.name
    }
  }
}

resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "qaktus-lambda-dynamodb"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:PutItem"]
      Resource = aws_dynamodb_table.links.arn
    }]
  })
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.generate_link.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:us-east-1:${data.aws_caller_identity.current.account_id}:${aws_apigatewayv2_api.api.id}/*/*"
}

# --- redirect Lambda ---

data "archive_file" "redirect_zip" {
  type        = "zip"
  source_file = "${path.root}/../lambda/redirect.py"
  output_path = "${path.root}/../lambda/redirect.zip"
}

resource "aws_iam_role" "redirect_lambda_exec" {
  name = "qaktus-redirect-lambda-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "redirect_basic" {
  role       = aws_iam_role.redirect_lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "redirect_dynamo" {
  name = "qaktus-redirect-dynamo-read"
  role = aws_iam_role.redirect_lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:GetItem"]
      Resource = aws_dynamodb_table.links.arn
    }]
  })
}

resource "aws_lambda_function" "redirect" {
  function_name    = "qaktus-redirect"
  filename         = data.archive_file.redirect_zip.output_path
  source_code_hash = data.archive_file.redirect_zip.output_base64sha256
  runtime          = "python3.12"
  handler          = "redirect.handler"
  role             = aws_iam_role.redirect_lambda_exec.arn

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.links.name
    }
  }
}

resource "aws_lambda_permission" "redirect_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.redirect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:us-east-1:${data.aws_caller_identity.current.account_id}:${aws_apigatewayv2_api.api.id}/*/*"
}
