import type { ExampleSource } from "../index";

/** Google Cloud (Cloud Run functions) variants of each example. */
export const EXAMPLES: ExampleSource[] = [
  {
    example: "basic",
    description: "A Cloud Run function with default ingress and the invoker role granted to allUsers, the usual way to publish a quick HTTP endpoint. A good place to start fixing things.",
    code: `provider "google" {
  project = "acme-orders"
  region  = "europe-west2"
}

resource "google_storage_bucket" "source" {
  name                        = "acme-orders-fn-source"
  location                    = "europe-west2"
  uniform_bucket_level_access = true
}

resource "google_storage_bucket_object" "source" {
  name   = "orders-api.zip"
  bucket = google_storage_bucket.source.name
  source = "build/orders-api.zip"
}

resource "google_cloudfunctions2_function" "orders" {
  name     = "orders-api"
  location = "europe-west2"

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
    available_memory = "256M"
    timeout_seconds  = 60
  }
}

# Lets anyone on the internet invoke the function without a token.
resource "google_cloud_run_service_iam_member" "public" {
  location = google_cloudfunctions2_function.orders.location
  service  = google_cloudfunctions2_function.orders.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
`,
  },
  {
    example: "intermediate",
    description:
      "Only one service account may invoke the function and scale-out is capped. Ingress still admits traffic from an external load balancer, and invocations aren't audit-logged.",
    code: `provider "google" {
  project = "acme-orders"
  region  = "europe-west2"
}

resource "google_storage_bucket" "source" {
  name                        = "acme-orders-fn-source"
  location                    = "europe-west2"
  uniform_bucket_level_access = true
}

resource "google_storage_bucket_object" "source" {
  name   = "orders-api.zip"
  bucket = google_storage_bucket.source.name
  source = "build/orders-api.zip"
}

resource "google_service_account" "caller" {
  account_id   = "orders-api-caller"
  display_name = "Calls the orders API"
}

resource "google_cloudfunctions2_function" "orders" {
  name     = "orders-api"
  location = "europe-west2"

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
    available_memory   = "256M"
    timeout_seconds    = 60
    max_instance_count = 20
    # Internal traffic plus a Google Cloud load balancer, which may be internet-facing.
    ingress_settings = "ALLOW_INTERNAL_AND_GCLB"
  }
}

resource "google_cloud_run_service_iam_member" "caller" {
  location = google_cloudfunctions2_function.orders.location
  service  = google_cloudfunctions2_function.orders.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:\${google_service_account.caller.email}"
}
`,
  },
  {
    example: "hardened",
    description:
      "An internal-only function invoked by a single service account, with capped scale-out, a customer-managed key for code and image, and Data Access audit logs for every invocation.",
    code: `provider "google" {
  project = "acme-orders"
  region  = "europe-west2" # CCC.Core.CN06: trusted region
}

variable "kms_key_name" {
  description = "Cloud KMS key in europe-west2 that the Cloud Run, Cloud Functions and Artifact Registry service agents can use."
  type        = string
}

resource "google_storage_bucket" "source" {
  name                        = "acme-orders-fn-source"
  location                    = "europe-west2"
  uniform_bucket_level_access = true
}

resource "google_storage_bucket_object" "source" {
  name   = "orders-api.zip"
  bucket = google_storage_bucket.source.name
  source = "build/orders-api.zip"
}

resource "google_artifact_registry_repository" "images" {
  repository_id = "orders-api-images"
  location      = "europe-west2"
  format        = "DOCKER"
  kms_key_name  = var.kms_key_name
}

resource "google_service_account" "caller" {
  account_id   = "orders-api-caller"
  display_name = "Calls the orders API"
}

resource "google_cloudfunctions2_function" "orders" {
  name         = "orders-api"
  location     = "europe-west2"
  kms_key_name = var.kms_key_name # CCC.Core.CN02: customer-managed key

  build_config {
    runtime           = "python312"
    entry_point       = "handler"
    docker_repository = google_artifact_registry_repository.images.id
    source {
      storage_source {
        bucket = google_storage_bucket.source.name
        object = google_storage_bucket_object.source.name
      }
    }
  }

  service_config {
    available_memory                 = "256M"
    timeout_seconds                  = 60
    ingress_settings                 = "ALLOW_INTERNAL_ONLY" # CCC.SvlsComp.CN01: no public ingress
    max_instance_count               = 10                    # CCC.SvlsComp.CN02: invocation cap
    max_instance_request_concurrency = 1
  }
}

# CCC.Core.CN05: only this identity may invoke; no allUsers.
resource "google_cloud_run_service_iam_member" "caller" {
  location = google_cloudfunctions2_function.orders.location
  service  = google_cloudfunctions2_function.orders.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:\${google_service_account.caller.email}"
}

# CCC.Core.CN04: record who invoked or read the function.
resource "google_project_iam_audit_config" "run" {
  project = "acme-orders"
  service = "run.googleapis.com"
  audit_log_config {
    log_type = "DATA_READ"
  }
  audit_log_config {
    log_type = "DATA_WRITE"
  }
}
`,
  },
];
