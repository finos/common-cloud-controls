import type { LabsTemplate } from "./types";

/** Built-in starter templates. The CCC integration fixture is added at build time by src/plugin/labs. */
export const BUILT_IN_TEMPLATES: LabsTemplate[] = [
  {
    id: "minimal",
    title: "Minimal bucket",
    description: "A bare bucket relying on AWS defaults. A good place to start fixing things.",
    code: `provider "aws" {
  region = "eu-west-2"
}

resource "aws_s3_bucket" "data" {
  bucket = "acme-trading-data"
}
`,
  },
  {
    id: "hardened",
    title: "Hardened bucket",
    description: "A bucket configured to satisfy every statically-checkable requirement at TLP:AMBER.",
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
    id: "public",
    title: "Public website (anti-pattern)",
    description: "A static-website bucket that opens itself to the internet. Watch the failures pile up.",
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
];
