resource "aws_s3_bucket" "cloudtrail" {
  bucket = "finos-ccc-integration-cloudtrail-logs"

  tags = merge(var.common_tags, {
    Name          = "finos-ccc-integration-cloudtrail-logs"
    CFIControlSet = "CCC.Core"
  })
}

resource "aws_s3_bucket_versioning" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "cloudtrail_s3" {
  statement {
    sid    = "AWSCloudTrailAclCheck"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    actions = ["s3:GetBucketAcl"]
    resources = [
      aws_s3_bucket.cloudtrail.arn,
    ]
  }

  statement {
    sid    = "AWSCloudTrailWrite"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    actions = ["s3:PutObject"]
    resources = [
      "${aws_s3_bucket.cloudtrail.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*",
    ]

    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }
  }
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id
  policy = data.aws_iam_policy_document.cloudtrail_s3.json
}

resource "aws_cloudwatch_log_group" "cloudtrail" {
  name              = "/aws/cloudtrail/finos-ccc-integration"
  retention_in_days = 7
  tags              = var.common_tags
}

data "aws_iam_policy_document" "cloudtrail_assume" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "cloudtrail_to_cw" {
  name               = "finos-ccc-integration-cloudtrail-to-cw"
  assume_role_policy = data.aws_iam_policy_document.cloudtrail_assume.json
  tags               = var.common_tags
}

data "aws_iam_policy_document" "cloudtrail_to_cw" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = [
      "${aws_cloudwatch_log_group.cloudtrail.arn}:*",
    ]
  }
}

resource "aws_iam_role_policy" "cloudtrail_to_cw" {
  name   = "finos-ccc-integration-cloudtrail-to-cw"
  role   = aws_iam_role.cloudtrail_to_cw.id
  policy = data.aws_iam_policy_document.cloudtrail_to_cw.json
}

resource "aws_cloudtrail" "main" {
  name                          = "finos-ccc-integration-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true

  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail_to_cw.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["${var.bucket_arn}/"]
    }

    data_resource {
      type   = "AWS::Lambda::Function"
      values = [var.lambda_function_arn]
    }
  }

  tags = var.common_tags

  depends_on = [
    aws_s3_bucket_policy.cloudtrail,
    aws_iam_role_policy.cloudtrail_to_cw,
  ]
}
