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
    Required (no default): EKS rejects RFC1918 ranges in publicAccessCidrs, so
    there is no safe placeholder. The root resolves this to the runner's public
    IP when the caller does not supply an explicit list.
  EOT

  validation {
    condition     = length(var.api_authorized_cidrs) > 0
    error_message = "api_authorized_cidrs must list at least one public CIDR; EKS rejects an empty or RFC1918-only public access list."
  }
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
