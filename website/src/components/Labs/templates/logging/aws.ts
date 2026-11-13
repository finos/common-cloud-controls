import type { ExampleSource } from "../index";

/** AWS (CloudTrail, CloudWatch Logs, VPC flow logs) variants of each example. */
export const EXAMPLES: ExampleSource[] = [
  {
    example: "basic",
    description:
      "A single-region CloudTrail trail writing to a bare S3 bucket, plus an application log group with default settings. Audit events are captured, but there are no flow logs, no retention policy, no immutability and no alerting.",
    code: `provider "aws" {
  region = "eu-west-2"
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "trail" {
  bucket = "acme-cloudtrail-logs"
}

resource "aws_s3_bucket_policy" "trail" {
  bucket = aws_s3_bucket.trail.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AWSCloudTrailAclCheck"
        Effect    = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action    = "s3:GetBucketAcl"
        Resource  = aws_s3_bucket.trail.arn
      },
      {
        Sid       = "AWSCloudTrailWrite"
        Effect    = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "\${aws_s3_bucket.trail.arn}/AWSLogs/\${data.aws_caller_identity.current.account_id}/*"
      }
    ]
  })
}

resource "aws_cloudtrail" "main" {
  name           = "acme-trail"
  s3_bucket_name = aws_s3_bucket.trail.id
  depends_on     = [aws_s3_bucket_policy.trail]
}

resource "aws_cloudwatch_log_group" "app" {
  name = "/acme/app"
}
`,
  },
  {
    example: "intermediate",
    description:
      "A multi-region trail and VPC flow logs with a private, encrypted trail bucket, a one-year lifecycle and an EventBridge alert when the trail is stopped. The flow log group only keeps 90 days, nothing is immutable or encrypted with your own key, and log queries aren't monitored.",
    code: `provider "aws" {
  region = "eu-west-2"
}

variable "vpc_id" {
  type = string
}

variable "flow_log_role_arn" {
  type = string
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "trail" {
  bucket = "acme-cloudtrail-logs"
}

resource "aws_s3_bucket_public_access_block" "trail" {
  bucket                  = aws_s3_bucket.trail.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "trail" {
  bucket = aws_s3_bucket.trail.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "trail" {
  bucket = aws_s3_bucket.trail.id
  rule {
    id     = "expire-after-one-year"
    status = "Enabled"
    filter {}
    expiration {
      days = 365
    }
  }
}

resource "aws_s3_bucket_policy" "trail" {
  bucket = aws_s3_bucket.trail.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = [aws_s3_bucket.trail.arn, "\${aws_s3_bucket.trail.arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
      {
        Sid       = "AWSCloudTrailWrite"
        Effect    = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action    = ["s3:GetBucketAcl", "s3:PutObject"]
        Resource  = [aws_s3_bucket.trail.arn, "\${aws_s3_bucket.trail.arn}/AWSLogs/\${data.aws_caller_identity.current.account_id}/*"]
      }
    ]
  })
}

resource "aws_cloudtrail" "main" {
  name                       = "acme-trail"
  s3_bucket_name             = aws_s3_bucket.trail.id
  is_multi_region_trail      = true
  enable_log_file_validation = true
  depends_on                 = [aws_s3_bucket_policy.trail]
}

resource "aws_cloudwatch_log_group" "flow" {
  name              = "/acme/vpc-flow-logs"
  retention_in_days = 90
}

resource "aws_flow_log" "vpc" {
  vpc_id          = var.vpc_id
  traffic_type    = "REJECT"
  iam_role_arn    = var.flow_log_role_arn
  log_destination = aws_cloudwatch_log_group.flow.arn
}

resource "aws_sns_topic" "security" {
  name = "acme-security-alerts"
}

resource "aws_cloudwatch_event_rule" "trail_stopped" {
  name = "cloudtrail-stopped"
  event_pattern = jsonencode({
    source = ["aws.cloudtrail"]
    detail = { eventName = ["StopLogging", "DeleteTrail"] }
  })
}

resource "aws_cloudwatch_event_target" "trail_stopped" {
  rule = aws_cloudwatch_event_rule.trail_stopped.name
  arn  = aws_sns_topic.security.arn
}
`,
  },
  {
    example: "hardened",
    description:
      "An organisation trail and VPC flow logs delivered to one WORM-locked, KMS-encrypted central bucket, with a mirrored CloudWatch log group that drives tamper and query-anomaly alarms. Satisfies every statically checkable requirement at TLP:AMBER.",
    code: `# Central audit logging, deployed from the organisation's management account.
provider "aws" {
  region = "eu-west-2"
}

variable "log_kms_key_arn" {
  description = "Customer-managed KMS key whose key policy lets CloudTrail and CloudWatch Logs use it"
  type        = string
}

variable "trail_to_cwl_role_arn" {
  description = "Role CloudTrail assumes to write to CloudWatch Logs"
  type        = string
}

variable "vpc_id" {
  type = string
}

resource "aws_s3_bucket" "logs" {
  bucket              = "acme-central-audit-logs"
  object_lock_enabled = true
}

resource "aws_s3_bucket_object_lock_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  rule {
    default_retention {
      mode = "COMPLIANCE" # CCC.Logging.CN03: no one can delete or alter logs early
      days = 365
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  rule {
    id     = "expire-after-retention"
    status = "Enabled"
    filter {}
    expiration {
      days = 365 # CCC.Logging.CN02: keep for, and no longer than, the policy period
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.log_kms_key_arn # CCC.Core.CN11: customer-managed key
    }
  }
}

# CCC.Logging.CN05: the log bucket can never be made public
resource "aws_s3_bucket_public_access_block" "logs" {
  bucket                  = aws_s3_bucket.logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "logs" {
  bucket = aws_s3_bucket.logs.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport" # CCC.Core.CN01
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = [aws_s3_bucket.logs.arn, "\${aws_s3_bucket.logs.arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
      {
        Sid       = "AllowLogDelivery"
        Effect    = "Allow"
        Principal = { Service = ["cloudtrail.amazonaws.com", "delivery.logs.amazonaws.com"] }
        Action    = ["s3:GetBucketAcl", "s3:PutObject"]
        Resource  = [aws_s3_bucket.logs.arn, "\${aws_s3_bucket.logs.arn}/AWSLogs/*"]
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "trail" {
  name              = "/acme/cloudtrail"
  retention_in_days = 365                 # CCC.Logging.CN02
  kms_key_id        = var.log_kms_key_arn # CCC.Core.CN11
}

# CCC.Logging.CN01: every account and region, delivered to the central bucket
resource "aws_cloudtrail" "org" {
  name                       = "acme-org-trail"
  s3_bucket_name             = aws_s3_bucket.logs.id
  is_organization_trail      = true # CCC.Core.CN09: member accounts can't stop it
  is_multi_region_trail      = true
  enable_log_file_validation = true
  kms_key_id                 = var.log_kms_key_arn
  cloud_watch_logs_group_arn = "\${aws_cloudwatch_log_group.trail.arn}:*"
  cloud_watch_logs_role_arn  = var.trail_to_cwl_role_arn
  depends_on                 = [aws_s3_bucket_policy.logs]
}

# CCC.Logging.CN01: all network flows, to the same locked bucket
resource "aws_flow_log" "vpc" {
  vpc_id               = var.vpc_id
  traffic_type         = "ALL"
  log_destination_type = "s3"
  log_destination      = aws_s3_bucket.logs.arn
}

resource "aws_sns_topic" "security" {
  name = "acme-security-alerts"
}

# CCC.Logging.CN07: alert when logging is stopped, deleted or reconfigured
resource "aws_cloudwatch_log_metric_filter" "logging_changes" {
  name           = "logging-config-changes"
  log_group_name = aws_cloudwatch_log_group.trail.name
  pattern        = "{ ($.eventName = StopLogging) || ($.eventName = DeleteTrail) || ($.eventName = UpdateTrail) || ($.eventName = PutEventSelectors) || ($.eventName = DeleteLogGroup) || ($.eventName = DeleteFlowLogs) }"
  metric_transformation {
    name      = "LoggingConfigChanges"
    namespace = "Acme/Security"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "logging_changes" {
  alarm_name          = "logging-config-changed"
  namespace           = "Acme/Security"
  metric_name         = "LoggingConfigChanges"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  alarm_actions       = [aws_sns_topic.security.arn]
}

# CCC.Logging.CN06: alert on an unusual volume of log queries
resource "aws_cloudwatch_log_metric_filter" "log_queries" {
  name           = "log-queries"
  log_group_name = aws_cloudwatch_log_group.trail.name
  pattern        = "{ ($.eventSource = logs.amazonaws.com) && (($.eventName = StartQuery) || ($.eventName = FilterLogEvents) || ($.eventName = GetLogEvents)) }"
  metric_transformation {
    name      = "LogQueries"
    namespace = "Acme/Security"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "log_queries" {
  alarm_name          = "anomalous-log-queries"
  comparison_operator = "GreaterThanUpperThreshold"
  evaluation_periods  = 2
  threshold_metric_id = "band"
  alarm_actions       = [aws_sns_topic.security.arn]
  metric_query {
    id          = "band"
    expression  = "ANOMALY_DETECTION_BAND(queries, 3)"
    return_data = true
  }
  metric_query {
    id          = "queries"
    return_data = true
    metric {
      namespace   = "Acme/Security"
      metric_name = "LogQueries"
      period      = 300
      stat        = "Sum"
    }
  }
}
`,
  },
];
