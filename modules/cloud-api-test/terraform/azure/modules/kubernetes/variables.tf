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
    Required (no default): AKS rejects RFC1918 ranges in authorized IP ranges, so
    there is no safe placeholder. The root resolves this to the runner's public
    IP when the caller does not supply an explicit list.
    Note: AKS with authorized IP ranges still exposes a public FQDN — CN01.AR02 treats that as public unless private_cluster_enabled.
  EOT

  validation {
    condition     = length(var.api_authorized_cidrs) > 0
    error_message = "api_authorized_cidrs must list at least one public CIDR; AKS rejects an empty or RFC1918-only authorized IP list."
  }
}

variable "kubernetes_version" {
  type        = string
  description = "AKS Kubernetes version. Leave empty to let Azure pick the default supported version."
  default     = null
}

variable "node_vm_size" {
  type        = string
  description = "AKS system-pool SKU. Gen1 Standard_B2s is no longer allowed for AKS in westus2; D2s_v3 matches the standalone VM fixture and has DSv3 quota."
  default     = "Standard_D2s_v3"
}
