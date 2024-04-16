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

  depends_on = [ google_kms_crypto_key_iam_binding.trusted_kms_key_binding ]
}

data "archive_file" "my_function_src" {
  type             = "zip"
  source_dir       = "${path.module}/src"
  output_file_mode = "0666"
  output_path      = "${path.module}/example_src.zip"
}
resource "google_storage_bucket_object" "src" {
  name   = "example_src_${data.archive_file.my_function_src.output_md5}.zip"
  bucket = google_storage_bucket.malicious_storage_bucket.name
  source = data.archive_file.my_function_src.output_path
}
resource "google_cloudfunctions_function" "untrusted_enc_obj_deleter" {
  name                  = "${var.bucket_name}-ccc-os-c2-autorem-control"
  runtime               = "python39"
  entry_point           = "delete_object"
  source_archive_bucket = google_storage_bucket_object.src.bucket
  source_archive_object = google_storage_bucket_object.src.name

  event_trigger {
    event_type = "google.storage.object.finalize"
    resource   = google_storage_bucket.malicious_storage_bucket.name
  }

  https_trigger_security_level = "SECURE_ALWAYS"
}

resource "random_string" "random" {
  length  = 5
  special = false
}
resource "google_kms_key_ring" "keyring" {
  name     = "${var.bucket_name}-ccc-os-c2-kr-${random_string.random.id}"
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

resource "google_kms_crypto_key_iam_binding" "trusted_kms_key_binding" {
  crypto_key_id = google_kms_crypto_key.trusted_cmek.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  members = [
    "serviceAccount:service-54950397547@gs-project-accounts.iam.gserviceaccount.com" # Cloud Storage service account
  ]
}

# Malicious Threat Actor adds a key binding for the untrusted CMEK to the Default Service Account
resource "google_kms_crypto_key_iam_binding" "untrusted_kms_key_binding" {
  crypto_key_id = google_kms_crypto_key.untrusted_cmek.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  members = [
    "serviceAccount:service-54950397547@gs-project-accounts.iam.gserviceaccount.com" # Cloud Storage service account
  ]
}

resource "google_kms_crypto_key" "untrusted_cmek" {
  name            = "${var.bucket_name}-untrusted-ccc-os-c2"
  key_ring        = google_kms_key_ring.keyring.id
  rotation_period = "7776000s"

  lifecycle {
    prevent_destroy = false
  }
}
