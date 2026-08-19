variable "region" {
  type    = string
  default = "us-east-1"
}

variable "vm_instance_type" {
  type    = string
  default = "t3.micro"
}

variable "k8s_api_authorized_cidrs" {
  type        = list(string)
  description = <<-EOT
    CIDRs allowed to reach finos-ccc-integration-k8s-main public API (CN01).
    Prerequisite: include CI/runner egress; exclude aws-test-infra reachability-probe egress.
    EKS rejects RFC1918 ranges here, so these must be public CIDRs.
    Leave empty to auto-detect the applying machine's public IP as a /32.
  EOT
  default     = []
}

variable "k8s_version" {
  type        = string
  description = "EKS Kubernetes version for main and bad clusters."
  default     = "1.31"
}
