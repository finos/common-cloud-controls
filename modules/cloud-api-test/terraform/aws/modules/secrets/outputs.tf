output "secret_name" {
  value = aws_secretsmanager_secret.main.name
}

output "secret_id" {
  value = aws_secretsmanager_secret.main.id
}

output "stale_version_id" {
  value = aws_secretsmanager_secret_version.v1.version_id
}

output "authorized_region" {
  value = data.aws_region.current.name
}

output "unauthorized_region" {
  value = var.unauthorized_region
}

data "aws_region" "current" {}
