output "main_cluster_name" {
  value = aws_eks_cluster.main.name
}

output "bad_cluster_name" {
  value = aws_eks_cluster.bad.name
}

output "main_cluster_arn" {
  value = aws_eks_cluster.main.arn
}

output "bad_cluster_arn" {
  value = aws_eks_cluster.bad.arn
}

output "main_endpoint" {
  value = aws_eks_cluster.main.endpoint
}

output "bad_endpoint" {
  value = aws_eks_cluster.bad.endpoint
}

output "main_certificate_authority_data" {
  value     = aws_eks_cluster.main.certificate_authority[0].data
  sensitive = true
}

output "bad_certificate_authority_data" {
  value     = aws_eks_cluster.bad.certificate_authority[0].data
  sensitive = true
}

output "main_oidc_issuer_url" {
  value = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

output "region" {
  value = var.region
}

output "control_plane_log_group_name" {
  description = "CloudWatch log group for MAIN cluster API/audit logs (CN14.AR01 / logging.QueryLogs)."
  value       = aws_cloudwatch_log_group.main.name
}

output "bad_control_plane_log_group_name" {
  value = aws_cloudwatch_log_group.bad.name
}

output "secrets_kms_key_arn" {
  value = aws_kms_key.secrets.arn
}

output "wi_bound_role_arn" {
  value = aws_iam_role.wi_bound.arn
}

output "wi_probe_bucket_name" {
  value = aws_s3_bucket.wi_probe.bucket
}

output "node_role_arn" {
  value = aws_iam_role.node.arn
}

output "vpc_cni_role_arn" {
  value = aws_iam_role.vpc_cni.arn
}

output "ebs_csi_role_arn" {
  value = aws_iam_role.ebs_csi.arn
}

output "api_authorized_cidrs" {
  value = var.api_authorized_cidrs
}

output "fixture_metadata" {
  value = local.fixture_metadata
}

output "vpc_id" {
  value = aws_vpc.k8s.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
