resource "google_storage_bucket" "auto-expire" {
  name          = "${var.bucket_name}-ccc-os-c3"
  location      = "US"
  force_destroy = true

  public_access_prevention = "enforced" # Enabling public access

  lifecycle {
    ignore_changes = [ # Disabling public access to this
      uniform_bucket_level_access
    ]
  }
}