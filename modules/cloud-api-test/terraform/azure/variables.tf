variable "location" {
  type        = string
  default     = "westus2"
  description = "Azure region for integration fixtures. westus2 used by default due eastus capacity limits on small SKUs."
}

variable "subscription_id" {
  type        = string
  description = "Azure subscription id"
  default     = "c1cedd8e-bf91-4d7d-a4cc-45700402a2a1"
}

variable "enable_serverless_computing" {
  type        = bool
  default     = false
  description = "Toggle serverless fixtures when Microsoft.Web capacity/quota is unavailable."
}

variable "integration_runner_client_id" {
  type        = string
  default     = ""
  description = "Application (client) ID of the principal that runs integration tests (GitHub AZURE_CLIENT_ID). Granted Key Vault secret Get/List and AKS Azure RBAC Cluster Admin on apply."
}

variable "key_vault_secret_reader_object_ids" {
  type        = list(string)
  default     = []
  description = "Additional Entra object IDs granted Key Vault secret Get/List on finoscccintkvsec."
}

variable "k8s_version" {
  type        = string
  description = "AKS Kubernetes version; null lets Azure choose the default supported version."
  default     = null
}

variable "webhook_probe_image" {
  type        = string
  description = <<-EOT
    Container image for the in-cluster CN11.AR03 admission-webhook probe.
    Default is a pause stand-in so the Deployment exists; pin a real probe digest before behavioural CN11.AR03 runs.
  EOT
  default     = "mcr.microsoft.com/oss/kubernetes/pause:3.9"
}
