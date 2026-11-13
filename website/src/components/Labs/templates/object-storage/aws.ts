import type { ExampleSource } from "../index";

/** AWS (Amazon S3) variants of each example. */
export const EXAMPLES: ExampleSource[] = [
  {
    example: "basic",
    description: "A bare S3 bucket relying on AWS defaults. A good place to start fixing things.",
    code: `provider "aws" {
  region = "eu-west-2"
}

resource "aws_s3_bucket" "data" {
  bucket = "acme-trading-data"
}
`,
  },
  {
    example: "intermediate",
    description:
      "A common S3 baseline: versioning, default encryption, public access blocked and HTTPS enforced. It still lacks object lock, a customer-managed key, TLS 1.3, audit logging and storage tiering.",
    code: `provider "aws" {
  region = "eu-west-2"
}

resource "aws_s3_bucket" "data" {
  bucket = "acme-trading-data"
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Encrypted with the AWS-managed KMS key rather than a customer-managed one.
resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "data" {
  bucket                  = aws_s3_bucket.data.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "data" {
  bucket = aws_s3_bucket.data.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_logging" "data" {
  bucket        = aws_s3_bucket.data.id
  target_bucket = "acme-central-access-logs" # managed in the logging account
  target_prefix = "data/"
}

data "aws_iam_policy_document" "data" {
  statement {
    sid     = "DenyInsecureTransport"
    effect  = "Deny"
    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.data.arn,
      "\${aws_s3_bucket.data.arn}/*",
    ]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "data" {
  bucket = aws_s3_bucket.data.id
  policy = data.aws_iam_policy_document.data.json
}
`,
  },
  {
    example: "hardened",
    description: "An S3 bucket configured to satisfy every statically-checkable requirement at TLP:AMBER.",
    code: `provider "aws" {
  region = "eu-west-2"
}

resource "aws_kms_key" "data" {
  description         = "Trusted key for acme-trading-data"
  enable_key_rotation = true
}

resource "aws_s3_bucket" "data" {
  bucket              = "acme-trading-data"
  object_lock_enabled = true
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  versioning_configuration {
    status     = "Enabled"
    mfa_delete = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.data.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "data" {
  bucket                  = aws_s3_bucket.data.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "data" {
  bucket = aws_s3_bucket.data.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_object_lock_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  rule {
    default_retention {
      mode = "COMPLIANCE"
      days = 30
    }
  }
}

resource "aws_s3_bucket_logging" "data" {
  bucket        = aws_s3_bucket.data.id
  target_bucket = "acme-central-access-logs" # managed in the logging account
  target_prefix = "data/"
}

resource "aws_s3_bucket_lifecycle_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  rule {
    id     = "tiering"
    status = "Enabled"
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }
}

resource "aws_cloudtrail" "audit" {
  name           = "acme-audit"
  s3_bucket_name = "acme-central-audit-logs" # managed in the logging account
}

data "aws_iam_policy_document" "data" {
  statement {
    sid     = "DenyInsecureTransport"
    effect  = "Deny"
    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.data.arn,
      "\${aws_s3_bucket.data.arn}/*",
    ]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }

  statement {
    sid       = "DenyOldTls"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = ["\${aws_s3_bucket.data.arn}/*"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "NumericLessThan"
      variable = "s3:TlsVersion"
      values   = ["1.3"]
    }
  }

  statement {
    sid       = "DenyUntrustedKmsKeys"
    effect    = "Deny"
    actions   = ["s3:PutObject"]
    resources = ["\${aws_s3_bucket.data.arn}/*"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption-aws-kms-key-id"
      values   = [aws_kms_key.data.arn]
    }
  }

  statement {
    sid       = "LimitPresignedUrlAge"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = ["\${aws_s3_bucket.data.arn}/*"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "NumericGreaterThan"
      variable = "s3:signatureAge"
      values   = ["3600000"] # 1 hour, in milliseconds
    }
  }
}

resource "aws_s3_bucket_policy" "data" {
  bucket = aws_s3_bucket.data.id
  policy = data.aws_iam_policy_document.data.json
}
`,
  },
  {
    example: "public",
    description: "A static-website S3 bucket that opens itself to the internet. Watch the failures pile up.",
    code: `provider "aws" {
  region = "ap-southeast-1"
}

resource "aws_s3_bucket" "site" {
  bucket        = "acme-marketing-site"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_ownership_controls" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "site" {
  bucket = aws_s3_bucket.site.id
  acl    = "public-read"
}

resource "aws_s3_bucket_logging" "site" {
  bucket        = aws_s3_bucket.site.id
  target_bucket = aws_s3_bucket.site.id
  target_prefix = "logs/"
}

resource "aws_s3_bucket_lifecycle_configuration" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    id     = "cheap"
    status = "Enabled"
    transition {
      days          = 1
      storage_class = "ONEZONE_IA"
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicRead"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "\${aws_s3_bucket.site.arn}/*"
    }]
  })
}
`,
  },
  {
    example: "replicated",
    description:
      "A versioned bucket replicating to a disaster-recovery bucket through a second provider. The replica's region (us-west-2) isn't trusted: try moving it to eu-west-1.",
    code: `provider "aws" {
  region = "eu-west-2"
}

provider "aws" {
  alias  = "dr"
  region = "us-west-2"
}

resource "aws_s3_bucket" "primary" {
  bucket = "acme-ledger-primary"
}

resource "aws_s3_bucket_versioning" "primary" {
  bucket = aws_s3_bucket.primary.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "primary" {
  bucket                  = aws_s3_bucket.primary.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "replica" {
  provider = aws.dr
  bucket   = "acme-ledger-replica"
}

resource "aws_s3_bucket_versioning" "replica" {
  provider = aws.dr
  bucket   = aws_s3_bucket.replica.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_iam_role" "replication" {
  name = "acme-ledger-replication"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "s3.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_s3_bucket_replication_configuration" "primary" {
  depends_on = [aws_s3_bucket_versioning.primary]
  bucket     = aws_s3_bucket.primary.id
  role       = aws_iam_role.replication.arn

  rule {
    id     = "everything"
    status = "Enabled"
    destination {
      bucket        = aws_s3_bucket.replica.arn
      storage_class = "STANDARD_IA"
    }
  }
}
`,
  },
  {
    example: "datalake",
    description:
      "Raw, curated and log buckets for an analytics platform. The raw zone tiers data to an unapproved class, and the log bucket itself is barely protected. Pick one bucket under \"Storage in scope\" to focus on it.",
    code: `provider "aws" {
  region = "eu-west-1"
}

# ── Raw zone ──────────────────────────────────────────────

resource "aws_s3_bucket" "raw" {
  bucket = "acme-lake-raw"
}

resource "aws_s3_bucket_versioning" "raw" {
  bucket = aws_s3_bucket.raw.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_logging" "raw" {
  bucket        = aws_s3_bucket.raw.id
  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "raw/"
}

resource "aws_s3_bucket_lifecycle_configuration" "raw" {
  bucket = aws_s3_bucket.raw.id
  rule {
    id     = "cool-down"
    status = "Enabled"
    transition {
      days          = 30
      storage_class = "ONEZONE_IA" # single-AZ: lower durability
    }
    transition {
      days          = 180
      storage_class = "GLACIER"
    }
  }
}

# ── Curated zone ──────────────────────────────────────────

resource "aws_s3_bucket" "curated" {
  bucket = "acme-lake-curated"
}

resource "aws_s3_bucket_versioning" "curated" {
  bucket = aws_s3_bucket.curated.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "curated" {
  bucket = aws_s3_bucket.curated.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_ownership_controls" "curated" {
  bucket = aws_s3_bucket.curated.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_logging" "curated" {
  bucket        = aws_s3_bucket.curated.id
  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "curated/"
}

resource "aws_s3_bucket_lifecycle_configuration" "curated" {
  bucket = aws_s3_bucket.curated.id
  rule {
    id     = "tiering"
    status = "Enabled"
    transition {
      days          = 90
      storage_class = "INTELLIGENT_TIERING"
    }
  }
}

# ── Access logs ───────────────────────────────────────────

resource "aws_s3_bucket" "logs" {
  bucket = "acme-lake-access-logs"
}

# Applies to every bucket in the account
resource "aws_s3_account_public_access_block" "this" {
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudtrail" "lake" {
  name           = "acme-lake-trail"
  s3_bucket_name = "acme-central-audit-logs" # managed in the logging account

  event_selector {
    read_write_type           = "WriteOnly"
    include_management_events = true
    data_resource {
      type   = "AWS::S3::Object"
      values = ["\${aws_s3_bucket.curated.arn}/"]
    }
  }
}
`,
  },
];
