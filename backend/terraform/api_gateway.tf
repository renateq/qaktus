
resource "aws_apigatewayv2_api" "api" {
  name          = "qaktus-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "generate_link" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.generate_link.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "generate_link" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /generate-link"
  target    = "integrations/${aws_apigatewayv2_integration.generate_link.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
}
