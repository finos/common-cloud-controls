import type { ExampleSource } from "../index";

/** Google Cloud (Cloud Logging) variants of each example. */
export const EXAMPLES: ExampleSource[] = [
  {
    example: "basic",
    description:
      "A project sink copying audit logs into a log bucket with default settings, next to a subnet with flow logs off. Audit logs are routed, but only for this project, into a global, 30-day, unlocked bucket, and nothing alerts on tampering.",
    code: `provider "google" {
  project = "acme-logging"
  region  = "europe-west2"
}

resource "google_logging_project_bucket_config" "audit" {
  project   = "acme-logging"
  location  = "global"
  bucket_id = "audit-logs"
}

resource "google_logging_project_sink" "audit" {
  name                   = "audit-to-bucket"
  destination            = "logging.googleapis.com/\${google_logging_project_bucket_config.audit.id}"
  filter                 = "logName:\\"cloudaudit.googleapis.com\\""
  unique_writer_identity = true
}

resource "google_compute_subnetwork" "app" {
  name          = "app"
  network       = "default"
  region        = "europe-west2"
  ip_cidr_range = "10.10.0.0/24"
}
`,
  },
  {
    example: "intermediate",
    description:
      "An organisation sink routes every project's audit logs to a regional log bucket, subnets record flow logs, and an alert fires when a sink changes. Flow logs aren't routed centrally, the bucket keeps only 90 days and isn't locked or CMEK-encrypted, and log queries aren't monitored.",
    code: `provider "google" {
  project = "acme-logging"
  region  = "europe-west2"
}

variable "org_id" {
  type = string
}

resource "google_logging_project_bucket_config" "central" {
  project        = "acme-logging"
  location       = "europe-west2"
  bucket_id      = "central-audit"
  retention_days = 90
}

resource "google_logging_organization_sink" "central" {
  name             = "central-audit"
  org_id           = var.org_id
  include_children = true
  destination      = "logging.googleapis.com/\${google_logging_project_bucket_config.central.id}"
  filter           = "logName:\\"cloudaudit.googleapis.com\\""
}

resource "google_project_iam_member" "sink_writer" {
  project = "acme-logging"
  role    = "roles/logging.bucketWriter"
  member  = google_logging_organization_sink.central.writer_identity
}

resource "google_compute_subnetwork" "app" {
  name          = "app"
  network       = "default"
  region        = "europe-west2"
  ip_cidr_range = "10.10.0.0/24"

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

resource "google_monitoring_notification_channel" "soc" {
  display_name = "SOC"
  type         = "email"
  labels = {
    email_address = "soc@example.com"
  }
}

resource "google_monitoring_alert_policy" "sink_changed" {
  display_name          = "Log sink changed"
  combiner              = "OR"
  notification_channels = [google_monitoring_notification_channel.soc.id]

  conditions {
    display_name = "Sink deleted or updated"
    condition_matched_log {
      filter = "protoPayload.methodName:(\\"DeleteSink\\" OR \\"UpdateSink\\")"
    }
  }

  alert_strategy {
    notification_rate_limit {
      period = "300s"
    }
  }
}
`,
  },
  {
    example: "hardened",
    description:
      "An organisation sink routes audit and flow logs into a locked, CMEK-encrypted regional log bucket kept for exactly a year, with alerts on logging tampering and on unusual log-read volume per principal. Satisfies every statically checkable requirement at TLP:AMBER.",
    code: `provider "google" {
  project = "acme-logging"
  region  = "europe-west2"
}

variable "org_id" {
  type = string
}

variable "kms_key_name" {
  description = "Cloud KMS key the Cloud Logging service agent may use"
  type        = string
}

resource "google_logging_project_bucket_config" "central" {
  project        = "acme-logging"
  location       = "europe-west2" # CCC.Core.CN06: trusted region, not "global"
  bucket_id      = "central-audit"
  retention_days = 365  # CCC.Logging.CN02
  locked         = true # CCC.Logging.CN03: retention can't be cut, bucket can't be deleted

  cmek_settings {
    kms_key_name = var.kms_key_name # CCC.Core.CN11
  }
}

# CCC.Logging.CN01: every project's audit and flow logs, including new projects
resource "google_logging_organization_sink" "central" {
  name             = "central-audit"
  org_id           = var.org_id
  include_children = true # CCC.Core.CN09: project owners can't remove it
  destination      = "logging.googleapis.com/\${google_logging_project_bucket_config.central.id}"
  filter           = "logName:\\"cloudaudit.googleapis.com\\" OR logName:\\"compute.googleapis.com%2Fvpc_flows\\""
}

resource "google_project_iam_member" "sink_writer" {
  project = "acme-logging"
  role    = "roles/logging.bucketWriter"
  member  = google_logging_organization_sink.central.writer_identity
}

resource "google_compute_subnetwork" "app" {
  name          = "app"
  network       = "default"
  region        = "europe-west2"
  ip_cidr_range = "10.10.0.0/24"

  log_config { # CCC.Logging.CN01: VPC flow logs
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 1.0
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Records who reads logs, so unusual query volume can be detected
resource "google_organization_iam_audit_config" "log_reads" {
  org_id  = var.org_id
  service = "logging.googleapis.com"
  audit_log_config {
    log_type = "DATA_READ"
  }
}

resource "google_monitoring_notification_channel" "soc" {
  display_name = "SOC"
  type         = "email"
  labels = {
    email_address = "soc@example.com"
  }
}

# CCC.Logging.CN07: alert when sinks, buckets or exclusions change
resource "google_monitoring_alert_policy" "logging_tampered" {
  display_name          = "Logging configuration changed"
  combiner              = "OR"
  notification_channels = [google_monitoring_notification_channel.soc.id]
  conditions {
    display_name = "Sink, bucket or exclusion changed"
    condition_matched_log {
      filter = "protoPayload.methodName:(\\"DeleteSink\\" OR \\"UpdateSink\\" OR \\"DeleteBucket\\" OR \\"UpdateBucket\\" OR \\"CreateExclusion\\")"
    }
  }
  alert_strategy {
    notification_rate_limit {
      period = "300s"
    }
  }
}

# CCC.Logging.CN06: count log reads per principal and alert on unusual volume
resource "google_logging_metric" "log_reads" {
  name        = "log-reads-by-principal"
  bucket_name = google_logging_project_bucket_config.central.id
  filter      = "protoPayload.methodName=\\"google.logging.v2.LoggingServiceV2.ListLogEntries\\""
  label_extractors = {
    principal = "EXTRACT(protoPayload.authenticationInfo.principalEmail)"
  }
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    labels {
      key        = "principal"
      value_type = "STRING"
    }
  }
}

resource "google_monitoring_alert_policy" "log_reads" {
  display_name          = "Unusual log read volume"
  combiner              = "OR"
  notification_channels = [google_monitoring_notification_channel.soc.id]
  conditions {
    display_name = "Log reads by one principal"
    condition_threshold {
      filter          = "metric.type=\\"logging.googleapis.com/user/\${google_logging_metric.log_reads.name}\\""
      comparison      = "COMPARISON_GT"
      threshold_value = 200
      duration        = "0s"
      aggregations {
        alignment_period     = "3600s"
        per_series_aligner   = "ALIGN_SUM"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["metric.label.principal"]
      }
    }
  }
}
`,
  },
];
