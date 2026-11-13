import type { ExampleSource } from "../index";

/** Google Cloud (Secret Manager) variants of each example. */
export const EXAMPLES: ExampleSource[] = [
  {
    example: "basic",
    description: "A database password with automatic replication, so Google chooses where it is stored and served, and no rotation schedule.",
    code: `provider "google" {
  project = "acme-orders-prod"
  region  = "europe-west2"
}

variable "db_password" {
  type      = string
  sensitive = true
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "orders-db-password"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}
`,
  },
  {
    example: "intermediate",
    description: "Replicas are pinned to trusted European regions and a rotation schedule notifies a Pub/Sub topic, but only every 180 days, beyond the 90-day threshold.",
    code: `provider "google" {
  project = "acme-orders-prod"
  region  = "europe-west2"
}

variable "db_password" {
  type      = string
  sensitive = true
}

data "google_project" "current" {}

resource "google_pubsub_topic" "rotation" {
  name = "secret-rotation"
}

resource "google_pubsub_topic_iam_member" "secret_manager" {
  topic  = google_pubsub_topic.rotation.id
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-\${data.google_project.current.number}@gcp-sa-secretmanager.iam.gserviceaccount.com"
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "orders-db-password"

  replication {
    user_managed {
      replicas {
        location = "europe-west2"
      }
      replicas {
        location = "europe-west1"
      }
    }
  }

  topics {
    name = google_pubsub_topic.rotation.id
  }

  rotation {
    rotation_period    = "15552000s" # 180 days
    next_rotation_time = "2027-01-01T00:00:00Z"
  }

  depends_on = [google_pubsub_topic_iam_member.secret_manager]
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}
`,
  },
  {
    example: "hardened",
    description: "Replicas only in trusted European regions and a 30-day rotation schedule that notifies a Pub/Sub topic, whose subscriber adds a new version and disables the old one.",
    code: `provider "google" {
  project = "acme-orders-prod"
  region  = "europe-west2"
}

variable "db_password" {
  type      = string
  sensitive = true
}

data "google_project" "current" {}

resource "google_pubsub_topic" "rotation" {
  name = "secret-rotation"
}

resource "google_pubsub_topic_iam_member" "secret_manager" {
  topic  = google_pubsub_topic.rotation.id
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-\${data.google_project.current.number}@gcp-sa-secretmanager.iam.gserviceaccount.com"
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "orders-db-password"

  # CCC.SecMgmt.CN02: store and serve the secret only in trusted regions
  replication {
    user_managed {
      replicas {
        location = "europe-west2"
      }
      replicas {
        location = "europe-west1"
      }
    }
  }

  # CCC.SecMgmt.CN01: rotate every 30 days; the subscriber disables the old version
  topics {
    name = google_pubsub_topic.rotation.id
  }

  rotation {
    rotation_period    = "2592000s" # 30 days
    next_rotation_time = "2027-01-01T00:00:00Z"
  }

  depends_on = [google_pubsub_topic_iam_member.secret_manager]
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}
`,
  },
];
