output "good_function_name" {
  value = google_cloudfunctions2_function.good.name
}

output "bad_function_name" {
  value = google_cloudfunctions2_function.bad.name
}

output "good_private_url" {
  value = "internal-only"
}

output "bad_public_url" {
  value = google_cloudfunctions2_function.bad.service_config[0].uri
}

output "rate_limit_threshold" {
  value = 10
}

output "burst_overrun" {
  value = 15
}
