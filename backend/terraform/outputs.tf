output "api_endpoint" {
  description = "POST to this URL to generate a short link"
  value       = "${aws_apigatewayv2_stage.default.invoke_url}/generate-link"
}
