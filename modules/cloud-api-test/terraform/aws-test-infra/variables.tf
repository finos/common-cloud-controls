variable "region" {
  type        = string
  description = "AWS region for reachability-probe (public vantage). Admission webhook objects are applied into the main EKS cluster from terraform/aws remote state."
  default     = "us-east-1"
}

variable "aws_root_backend" {
  type        = string
  description = <<-EOT
    Backend type used by modules/cloud-api-test/terraform/aws (e.g. local, s3).
    Prerequisite: apply the aws root first so remote state contains kubernetes outputs.
  EOT
  default     = "local"
}

variable "aws_root_backend_config" {
  type        = map(string)
  description = <<-EOT
    Backend config for terraform_remote_state of the aws root.
    local default points at ../aws/terraform.tfstate; for S3 pass bucket/key/region/dynamodb_table.
  EOT
  default = {
    path = "../aws/terraform.tfstate"
  }
}

variable "reachability_probe_image_override" {
  type        = string
  description = "Unused placeholder for a future container image of modules/probes/reachability; Lambda zip is used until that artifact exists."
  default     = ""
}

variable "webhook_probe_image" {
  type        = string
  description = <<-EOT
    Container image for admission-webhook-probe.
    Prerequisite: publish modules/probes/admission-webhook (or a temporary echo/nginx stand-in for infra bring-up only).
    Default is a public pause image so the Deployment/Service can exist; replace before CN11.AR03 behavioural runs.
  EOT
  default     = "public.ecr.aws/eks-distro/kubernetes/pause:3.9"
}

variable "common_tags" {
  type = map(string)
  default = {
    ManagedBy = "Terraform"
    Project   = "CCC-CFI-Compliance"
  }
}
