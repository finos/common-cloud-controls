output "function_name" {
  value = google_cloudfunctions2_function.main.name
}

output "private_endpoint_url" {
  value = "internal-only"
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
