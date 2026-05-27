output "function_name" {
  value = aws_lambda_function.main.function_name
}

output "private_endpoint_url" {
  value = "https://private-serverless-endpoint.internal.example.com/invoke"
}

output "public_invoke_url" {
  value = ""
}

output "rate_limit_threshold" {
  value = 10
}

output "burst_overrun" {
  value = 15
}
