variable "common_tags" {
  type        = map(string)
  description = "Tags merged onto every AWS resource. Must include ManagedBy and Project from the root."
}

variable "region" {
  type        = string
  description = "AWS region for EKS clusters, node groups, and control-plane log groups."
}

variable "api_authorized_cidrs" {
  type        = list(string)
  description = <<-EOT
    CIDRs allowed to reach the MAIN cluster public Kubernetes API (CN01.AR01).
    Must include integration-runner egress and MUST exclude the aws-test-infra
    reachability-probe public egress so CN01 untrusted probes fail.
    Prerequisite: set to real runner/NAT CIDRs before behavioural runs; the
    default is intentionally RFC1918-only so a misconfigured public probe fails.
  EOT
  default     = ["10.0.0.0/8"]
}

variable "kubernetes_version" {
  type        = string
  description = "EKS Kubernetes version. Use a currently supported minor; bump with CSP support matrix."
  default     = "1.31"
}

variable "node_instance_types" {
  type        = list(string)
  description = "Economical managed-node instance types (SPOT preferred). t3.medium is the practical EKS floor for system addons."
  default     = ["t3.medium"]
}

variable "wi_probe_bucket_name" {
  type        = string
  description = "S3 bucket name readable only by the bound IRSA role (CN03.AR01 wi-probe-resource)."
  default     = "finos-ccc-integration-k8s-wi-probe"
}
