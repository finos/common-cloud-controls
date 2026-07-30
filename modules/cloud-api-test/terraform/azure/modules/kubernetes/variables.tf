variable "location" {
  type        = string
  description = "Azure region for AKS fixtures."
}

variable "resource_group" {
  type        = string
  description = "Resource group hosting AKS clusters and supporting networking."
}

variable "common_tags" {
  type = map(string)
}

variable "api_authorized_cidrs" {
  type        = list(string)
  description = <<-EOT
    Authorized IP ranges for the MAIN AKS API server (CN01.AR01).
    Prerequisite: include integration-runner egress; exclude public reachability-probe egress.
    Note: AKS with authorized IP ranges still exposes a public FQDN — CN01.AR02 treats that as public unless private_cluster_enabled.
  EOT
  default     = ["10.0.0.0/8"]
}

variable "kubernetes_version" {
  type        = string
  description = "AKS Kubernetes version. Leave empty to let Azure pick the default supported version."
  default     = null
}

variable "node_vm_size" {
  type        = string
  description = "Economical node SKU. Standard_B2s is usually enough for a single-node fixture."
  default     = "Standard_B2s"
}
