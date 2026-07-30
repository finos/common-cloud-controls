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
  EOT
  default     = ["10.0.0.0/8"]
}

variable "k8s_version" {
  type        = string
  description = "EKS Kubernetes version for main and bad clusters."
  default     = "1.31"
}
