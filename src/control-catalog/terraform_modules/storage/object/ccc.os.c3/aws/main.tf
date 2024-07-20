data "aws_iam_policy_document" "deny_all_scp_policy" {
  statement {
    effect = "Deny"
    actions = ["s3:GetBucketPolicy",
    "s3:GetBucketAcl"]
    resources = [aws_s3_bucket.malicious_bucket.arn]
    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["public-read", "public-read-write", "authenticated-read"]
    }
  }
}

resource "aws_organizations_policy" "disable_public_access_policy" {
  name        = "DisablePublicAccessPolicy"
  description = "SCP to disable public access on S3 buckets"
  content     = data.aws_iam_policy_document.deny_all_scp_policy.json
  type        = "SERVICE_CONTROL_POLICY"
  tags = {
    Name = "DisablePublicAccessPolicy"
  }
}

resource "aws_s3_bucket" "malicious_bucket" {
  bucket        = "${var.bucket_name}-ccc-os-c3"
  force_destroy = true
}