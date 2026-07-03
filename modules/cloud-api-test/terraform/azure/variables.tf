variable "location" {
  type    = string
  default = "westus2"
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
  description = "Application (client) ID of the principal that runs integration tests (GitHub AZURE_CLIENT_ID). Resolved to a Key Vault secret reader policy on apply."
}

variable "key_vault_secret_reader_object_ids" {
  type        = list(string)
  default     = []
  description = "Additional Entra object IDs granted Key Vault secret Get/List on finoscccintkvsec."
}
