resource "random_id" "suffix" {
  byte_length = 3
}

resource "google_storage_bucket" "source" {
  name                        = "finoscccintegration${var.deployment_suffix}fn${random_id.suffix.hex}"
  location                    = var.region
  uniform_bucket_level_access = true
}

data "archive_file" "function_zip" {
  type                    = "zip"
  output_path             = "${path.module}/function-source.zip"
  source_content          = <<-PY
    import json
    def handler(request):
        return json.dumps({"ok": True})
  PY
  source_content_filename = "main.py"
}

resource "google_storage_bucket_object" "source" {
  name   = "function-source-${var.deployment_suffix}.zip"
  bucket = google_storage_bucket.source.name
  source = data.archive_file.function_zip.output_path
}

resource "google_cloudfunctions2_function" "main" {
  name     = "finos-ccc-integration-${var.deployment_suffix}-fn-main"
  location = var.region

  build_config {
    runtime     = "python312"
    entry_point = "handler"
    source {
      storage_source {
        bucket = google_storage_bucket.source.name
        object = google_storage_bucket_object.source.name
      }
    }
  }

  service_config {
    ingress_settings = "ALLOW_INTERNAL_ONLY"
  }

  labels = merge(var.common_labels, { cficontrolset = "ccc-svlscomp" })
}
