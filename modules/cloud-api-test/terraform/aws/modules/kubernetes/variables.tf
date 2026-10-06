variable "common_tags" {
  type        = map(string)
  description = "Tags merged onto every AWS resource. Must include ManagedBy and Project from the root."
}

variable "region" {
  type        = string
  description = "AWS region for EKS clusters, node groups, and control-plane log groups."
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
