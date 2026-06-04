resource "google_secret_manager_secret" "main" {
  secret_id = "finos-ccc-integration-secret-main"
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
  labels = {
    cfi_control_set = "ccc-sec-mgmt"
  }
}

resource "google_secret_manager_secret_version" "v1" {
  secret      = google_secret_manager_secret.main.id
  secret_data = "ccc-integration-secret-v1"
}

resource "google_secret_manager_secret_version" "v2" {
  secret      = google_secret_manager_secret.main.id
  secret_data = "ccc-integration-secret-v2"
  depends_on  = [google_secret_manager_secret_version.v1]
}

resource "terraform_data" "disable_v1" {
  depends_on = [google_secret_manager_secret_version.v2]

  provisioner "local-exec" {
    command = "gcloud secrets versions disable 1 --secret=${google_secret_manager_secret.main.secret_id} --project=${var.project_id} --quiet"
  }
}
