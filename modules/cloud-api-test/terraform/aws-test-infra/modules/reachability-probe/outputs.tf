output "probe_url" {
  description = "Public HTTPS URL for POST /v1/probes. Wire to CI as REACHABILITY_PROBE_URL — not a main aws-root output."
  value       = "${aws_apigatewayv2_api.probe.api_endpoint}/v1/probes"
}

output "observer_name" {
  value = var.observer_name
}

output "shared_secret_arn" {
  description = "Secrets Manager ARN for the HMAC shared secret. Put the secret value in CI secrets; never commit it."
  value       = aws_secretsmanager_secret.shared.arn
}

output "lambda_function_name" {
  value = aws_lambda_function.probe.function_name
}
