resource "google_secret_manager_regional_secret" "main" {
  secret_id = "finos-ccc-integration-secret-main"
  location  = var.region

  labels = {
    cfi_control_set = "ccc-sec-mgmt"
  }

  deletion_protection = false
}

resource "google_secret_manager_regional_secret_iam_member" "accessor" {
  for_each = toset(var.secret_accessor_members)

  project   = var.project_id
  location  = var.region
  secret_id = google_secret_manager_regional_secret.main.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = each.value
}

resource "google_secret_manager_regional_secret_version" "v1" {
  secret      = google_secret_manager_regional_secret.main.id
  secret_data = "ccc-integration-secret-v1"
  enabled     = false
}

resource "google_secret_manager_regional_secret_version" "v2" {
  secret      = google_secret_manager_regional_secret.main.id
  secret_data = "ccc-integration-secret-v2"
  depends_on  = [google_secret_manager_regional_secret_version.v1]

  lifecycle {
    create_before_destroy = true
  }
}
