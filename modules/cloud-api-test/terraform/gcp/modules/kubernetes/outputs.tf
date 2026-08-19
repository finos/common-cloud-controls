output "main_cluster_name" {
  value = google_container_cluster.main.name
}

output "bad_cluster_name" {
  value = google_container_cluster.bad.name
}

output "main_endpoint" {
  value = google_container_cluster.main.endpoint
}

output "bad_endpoint" {
  value = google_container_cluster.bad.endpoint
}

output "main_ca_certificate" {
  value     = google_container_cluster.main.master_auth[0].cluster_ca_certificate
  sensitive = true
}

output "region" {
  value = var.region
}

output "project_id" {
  value = var.project_id
}

output "location" {
  value = google_container_cluster.main.location
}

output "control_plane_log_name" {
  description = "GCP log name filter hint for GKE API server audit (CN14)."
  value       = "projects/${var.project_id}/logs/cloudaudit.googleapis.com%2Factivity"
}

output "wi_bound_email" {
  value = google_service_account.wi_bound.email
}

output "wi_probe_bucket" {
  value = google_storage_bucket.wi_probe.name
}

output "node_service_account" {
  value = google_service_account.node.email
}

output "api_authorized_cidrs" {
  value = var.api_authorized_cidrs
}

output "secrets_kms_key_id" {
  value = google_kms_crypto_key.gke.id
}

output "fixture_metadata" {
  value = local.fixture_metadata
}
