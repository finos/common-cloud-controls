output "good_function_name" {
  value = aws_lambda_function.good.function_name
}

output "bad_function_name" {
  value = aws_lambda_function.bad.function_name
}

output "bad_public_url" {
  value = aws_lambda_function_url.bad.function_url
}

output "private_endpoint_url" {
  value = "https://private-serverless-endpoint.internal.example.com/invoke"
}

output "rate_limit_threshold" {
  value = 10
}

output "burst_overrun" {
  value = 15
}
