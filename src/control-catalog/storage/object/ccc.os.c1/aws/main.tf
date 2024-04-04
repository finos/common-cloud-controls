resource "aws_s3_bucket" "malicious_bucket" {
  bucket = var.bucket_name
  force_destroy = true
}

resource "aws_s3_bucket_versioning" "malicious_bucket_versioning" {
  bucket = aws_s3_bucket.malicious_bucket.arn
  versioning_configuration {
    status = "Enabled"
  }
}