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

variable "azure_rbac_admin_object_ids" {
  type        = list(string)
  description = "Entra object IDs granted Azure Kubernetes Service RBAC Cluster Admin on the main cluster (integration runner + apply identity)."
  default     = []
}
