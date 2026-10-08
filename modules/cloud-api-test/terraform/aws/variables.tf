variable "region" {
  type    = string
  default = "us-east-1"
}

variable "vm_instance_type" {
  type    = string
  default = "t3.micro"
}

variable "k8s_version" {
  type        = string
  description = "EKS Kubernetes version for the integration cluster."
  default     = "1.31"
}

variable "webhook_probe_image" {
  type        = string
  description = <<-EOT
    Container image for the in-cluster CN11.AR03 admission-webhook probe.
    CI/deploy-aws.sh also kubectl-sets the live Deployment to the just-pushed ECR digest.
  EOT
  default     = "211203495394.dkr.ecr.us-east-1.amazonaws.com/finos-ccc-admission-webhook-probe@sha256:6f8d2c45f6f69852bee7df1c71483b3502471de95be924df113c4e5e6477bbb8"
}

variable "eks_admin_principal_arns" {
  type        = list(string)
  description = "Extra IAM principal ARNs granted EKS ClusterAdmin Access Entries (merged with CI TerraformRole + fixture users)."
  default     = []
}

variable "ci_runner_role_name" {
  type        = string
  description = "IAM role assumed by GitHub Actions for cloud-api integration (needs an EKS Access Entry)."
  default     = "TerraformRole"
}

variable "fixture_iam_user_names" {
  type        = list(string)
  description = "Fixture IAM users that exercise the Kubernetes API under test identities (provision-aws.sh cohort)."
  default = [
    "cfi-integration-admin",
    "cfi-integration-write",
  ]
}
