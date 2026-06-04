output "secret_id" {
  value = google_secret_manager_secret.main.secret_id
}

output "secret_name" {
  value = google_secret_manager_secret.main.secret_id
}

output "stale_version_id" {
  value = "1"
}

output "authorized_region" {
  value = var.region
}

output "unauthorized_region" {
  value = var.unauthorized_region
}
