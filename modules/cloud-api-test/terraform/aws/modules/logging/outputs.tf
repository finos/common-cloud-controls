output "resource_name" {
  value = "aws-logging"
}

output "cloudtrail_name" {
  value = aws_cloudtrail.main.name
}
