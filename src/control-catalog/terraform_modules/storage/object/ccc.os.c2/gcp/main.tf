resource "google_storage_bucket" "malicious_storage_bucket" {
  name          = "${var.bucket_name}-ccc-os-c2"
  location      = "us-central1"
  force_destroy = true

  versioning {
    enabled = true
  }
  encryption {
    default_kms_key_name = google_kms_crypto_key.trusted_cmek.id
  }

  uniform_bucket_level_access = true
}

data "google_iam_policy" "policy" {
  binding {
    role    = "roles/storage.objectCreator"
    members = ["user:*"]
    condition {
        title      = "Deny unencrypted uploads"
        description = "Only allow objects to be uploaded with a specific KMS key"
        expression = "resource.name.startsWith(\"projects/common-cloud-controls-testing/buckets/${google_storage_bucket.malicious_storage_bucket.name}/objects\") && !request.resource.labels.kms_key_name.startsWith(\"projects/common-cloud-controls-testing/locations/us-central1/keyRings/${google_kms_key_ring.keyring.id}/cryptoKeys/${google_kms_crypto_key.trusted_cmek.name}\")"
      }
  }
}

resource "google_storage_bucket_iam_policy" "name" {
  bucket = google_storage_bucket.malicious_storage_bucket.name
  policy_data = data.google_iam_policy.policy.policy_data
}

resource "google_kms_key_ring" "keyring" {
  name     = "${var.bucket_name}-ccc-os-c2-keyring"
  location = "us-central1"
}

resource "google_kms_crypto_key" "trusted_cmek" {
  name            = "${var.bucket_name}-trusted-ccc-os-c2"
  key_ring        = google_kms_key_ring.keyring.id
  rotation_period = "7776000s"

  lifecycle {
    prevent_destroy = false
  }
}

resource "google_kms_crypto_key" "untrusted_cmek" {
  name            = "${var.bucket_name}-untrusted-ccc-os-c2"
  key_ring        = google_kms_key_ring.keyring.id
  rotation_period = "7776000s"

  lifecycle {
    prevent_destroy = false
  }
}
