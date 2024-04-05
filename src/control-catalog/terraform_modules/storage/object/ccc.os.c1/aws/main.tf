data "aws_iam_policy_document" "default_bucket_policy" {
  statement {
    effect = "Deny"
    principals {
      identifiers = ["*"]
      type        = "*"
    }
    actions = [
      "s3:*",
    ]
    resources = [
      "${aws_s3_bucket.malicious_bucket.arn}",
      "${aws_s3_bucket.malicious_bucket.arn}/*"
    ]
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }

  statement {
    effect = "Allow"
    principals {
      identifiers = ["*"]
      type        = "*"
    }
    actions = [
      "s3:GetObject",
    ]
    resources = [
      "${aws_s3_bucket.malicious_bucket.arn}/*",
      "${aws_s3_bucket.malicious_bucket.arn}"
    ]
  }
}

# S3 Bucket
resource "aws_s3_bucket" "malicious_bucket" {
  bucket        = "${var.bucket_name}-ccc-os-c1"
  force_destroy = true
}

# S3 Bucket Policy/Control - Deny All HTTP Interactions
resource "aws_s3_bucket_policy" "deny_https_bucket_policy" {
  bucket = aws_s3_bucket.malicious_bucket.id
  policy = data.aws_iam_policy_document.default_bucket_policy.json

  depends_on = [ aws_s3_bucket_public_access_block.bucket_pab_config ]
}

resource "aws_s3_bucket_public_access_block" "bucket_pab_config" {
  bucket = aws_s3_bucket.malicious_bucket.id

  block_public_acls       = true
  block_public_policy     = false # Blocking due to policy creation
  ignore_public_acls      = true
  restrict_public_buckets = true
}