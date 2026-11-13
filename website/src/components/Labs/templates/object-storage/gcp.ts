import type { ExampleSource } from "../index";

/** Google Cloud (Cloud Storage, google provider) variants of each example. */
export const EXAMPLES: ExampleSource[] = [
  {
    example: "basic",
    description: "A bare Cloud Storage bucket relying on google provider defaults. A good place to start fixing things.",
    code: `provider "google" {
  project = "acme-trading"
  region  = "europe-west2"
}

resource "google_storage_bucket" "data" {
  name     = "acme-trading-data"
  location = "EUROPE-WEST2"
}
`,
  },
  {
    example: "intermediate",
    description:
      "A common Cloud Storage baseline: uniform access, public access prevention, versioning and access logs. It still uses Google-managed keys, with no retention policy, data-access audit logs or organisation policies.",
    code: `provider "google" {
  project = "acme-trading"
  region  = "europe-west2"
}

resource "google_storage_bucket" "data" {
  name                        = "acme-trading-data"
  location                    = "EUROPE-WEST2"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  soft_delete_policy {
    retention_duration_seconds = 604800 # 7 days, the default
  }

  logging {
    log_bucket = "acme-central-access-logs" # managed in the logging project
  }
}
`,
  },
  {
    example: "hardened",
    description:
      "A bucket configured to satisfy as many statically-checkable requirements as Cloud Storage allows at TLP:AMBER. Some requirements have no Cloud Storage setting and stay as live tests.",
    code: `provider "google" {
  project = "acme-trading"
  region  = "europe-west2"
}

variable "project_id" {
  type    = string
  default = "acme-trading"
}

# ── Customer-managed key ──────────────────────────────────

resource "google_kms_key_ring" "storage" {
  name     = "storage"
  location = "europe-west2"
}

resource "google_kms_crypto_key" "data" {
  name            = "acme-trading-data"
  key_ring        = google_kms_key_ring.storage.id
  rotation_period = "7776000s" # 90 days
}

# ── Bucket ────────────────────────────────────────────────

resource "google_storage_bucket" "data" {
  name                        = "acme-trading-data"
  location                    = "EUROPE-WEST2"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  encryption {
    default_kms_key_name = google_kms_crypto_key.data.id
  }

  # Cloud Storage doesn't allow Object Versioning together with a
  # retention policy, so soft delete provides recovery instead.
  retention_policy {
    retention_period = 2592000 # 30 days
    is_locked        = true
  }

  soft_delete_policy {
    retention_duration_seconds = 2592000 # 30 days
  }

  logging {
    log_bucket = "acme-central-access-logs" # managed in the logging project
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }
}

# ── Audit logging ─────────────────────────────────────────

resource "google_project_iam_audit_config" "storage" {
  project = var.project_id
  service = "storage.googleapis.com"
  audit_log_config {
    log_type = "DATA_READ"
  }
  audit_log_config {
    log_type = "DATA_WRITE"
  }
}

# ── Organisation policies (project scope) ─────────────────

resource "google_org_policy_policy" "cmek_projects" {
  name   = "projects/\${var.project_id}/policies/gcp.restrictCmekCryptoKeyProjects"
  parent = "projects/\${var.project_id}"
  spec {
    rules {
      values {
        allowed_values = ["under:projects/acme-trading"]
      }
    }
  }
}

resource "google_org_policy_policy" "tls" {
  name   = "projects/\${var.project_id}/policies/gcp.restrictTLSVersion"
  parent = "projects/\${var.project_id}"
  spec {
    rules {
      values {
        denied_values = ["TLS_VERSION_1", "TLS_VERSION_1_1"]
      }
    }
  }
}
`,
  },
  {
    example: "public",
    description: "A static-website bucket that grants allUsers read access, uses fine-grained ACLs and logs into itself. Watch the failures pile up.",
    code: `provider "google" {
  project = "acme-marketing"
  region  = "asia-southeast1"
}

resource "google_storage_bucket" "site" {
  name                        = "acme-marketing-site"
  location                    = "ASIA-SOUTHEAST1"
  force_destroy               = true
  uniform_bucket_level_access = false
  public_access_prevention    = "inherited"

  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }

  logging {
    log_bucket = "acme-marketing-site"
  }

  soft_delete_policy {
    retention_duration_seconds = 0
  }
}

resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.site.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

resource "google_storage_default_object_access_control" "public" {
  bucket = google_storage_bucket.site.name
  role   = "READER"
  entity = "allUsers"
}
`,
  },
  {
    example: "replicated",
    description:
      "A configurable dual-region bucket with turbo replication. One of its two regions (europe-north1) isn't trusted: add it to the trusted list or swap it for europe-west1.",
    code: `provider "google" {
  project = "acme-ledger"
  region  = "europe-west2"
}

resource "google_storage_bucket" "ledger" {
  name                        = "acme-ledger"
  location                    = "EU"
  rpo                         = "ASYNC_TURBO"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  custom_placement_config {
    data_locations = ["EUROPE-WEST2", "EUROPE-NORTH1"]
  }

  versioning {
    enabled = true
  }
}
`,
  },
  {
    example: "datalake",
    description:
      "Raw, curated and log buckets for an analytics platform. The raw zone moves data to a legacy reduced-availability class, and the log bucket itself is barely protected. Pick one bucket under \"Storage in scope\" to focus on it.",
    code: `provider "google" {
  project = "acme-lake"
  region  = "europe-west1"
}

# ── Raw zone ──────────────────────────────────────────────

resource "google_storage_bucket" "raw" {
  name                        = "acme-lake-raw"
  location                    = "EUROPE-WEST1"
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  logging {
    log_bucket = google_storage_bucket.logs.name
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "DURABLE_REDUCED_AVAILABILITY"
    }
  }
}

# ── Curated zone ──────────────────────────────────────────

resource "google_storage_bucket" "curated" {
  name                        = "acme-lake-curated"
  location                    = "EUROPE-WEST1"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  retention_policy {
    retention_period = 7776000 # 90 days
  }

  logging {
    log_bucket = google_storage_bucket.logs.name
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }
}

resource "google_storage_bucket_iam_member" "analysts" {
  bucket = google_storage_bucket.curated.name
  role   = "roles/storage.objectViewer"
  member = "group:analysts@acme.example"
}

# ── Logs ──────────────────────────────────────────────────

resource "google_storage_bucket" "logs" {
  name     = "acme-lake-access-logs"
  location = "EUROPE-WEST1"
}
`,
  },
];
