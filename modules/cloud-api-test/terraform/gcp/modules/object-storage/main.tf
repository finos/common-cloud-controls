resource "google_storage_bucket" "main" {
  name                        = "finos-ccc-integration-container-main"
  location                    = var.region
  project                     = var.project_id
  force_destroy               = false
  uniform_bucket_level_access = true

  retention_policy {
    retention_period = 172800
  }

  labels = merge(var.common_labels, {
    cficontrolset = "ccc-objstor"
  })
}
