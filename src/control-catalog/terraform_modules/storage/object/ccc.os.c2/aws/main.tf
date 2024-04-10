data "aws_iam_policy_document" "default_bucket_policy" {
  statement {
    effect = "Deny"
    principals {
      identifiers = ["*"]
      type        = "*"
    }
    actions = [
      "s3:PutObject",
    ]
    resources = [
      "${aws_s3_bucket.malicious_bucket.arn}/*"
    ]
    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption-aws-kms-key-id"
      values   = [aws_kms_key.trusted_kms_key.key_id]
    }
  }
}

# S3 Bucket
resource "aws_s3_bucket" "malicious_bucket" {
  bucket        = "${var.bucket_name}-ccc-os-c2"
  force_destroy = true
}

# S3 Bucket Policy/Control - Deny Put Requests with Untrusted KMS Key
resource "aws_s3_bucket_policy" "deny_puts_copies_with_untrusted_kms_key_bucket_policy" {
  bucket = aws_s3_bucket.malicious_bucket.id
  policy = data.aws_iam_policy_document.default_bucket_policy.json
}

# Trusted KMS Key
resource "aws_kms_key" "trusted_kms_key" {
  description = "Trusted KMS Key"
}

# Trusted KMS Key Alias
resource "aws_kms_alias" "trusted_kms_key_alias" {
  name          = "${var.bucket_name}-trusted-ccc-os-c2"
  target_key_id = aws_kms_key.trusted_kms_key.key_id
}

# Untrusted KMS Key
resource "aws_kms_key" "untrusted_kms_key" {
  description = "Untrusted KMS Key"
}

# Untrusted KMS Key Alias
resource "aws_kms_alias" "untrusted_kms_key_alias" {
  name          = "${var.bucket_name}-untrusted-ccc-os-c2"
  target_key_id = aws_kms_key.untrusted_kms_key.key_id
}