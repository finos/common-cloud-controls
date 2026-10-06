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
    Default is a pause stand-in so the Deployment exists; pin a real probe digest before behavioural CN11.AR03 runs.
  EOT
  default     = "public.ecr.aws/eks-distro/kubernetes/pause:3.9"
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
