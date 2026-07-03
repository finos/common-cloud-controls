output "bucket_name" {
  value = aws_s3_bucket.main.bucket
}

output "bucket_arn" {
  value = aws_s3_bucket.main.arn
}
