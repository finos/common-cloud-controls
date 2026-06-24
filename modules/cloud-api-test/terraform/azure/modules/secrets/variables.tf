variable "location" {
  type = string
}

variable "resource_group" {
  type = string
}

variable "key_vault_name" {
  type        = string
  description = "Globally unique Key Vault name (<= 24 chars)."
}

variable "common_tags" {
  type = map(string)
}

variable "unauthorized_region" {
  type    = string
  default = "westeurope"
}

variable "secret_reader_object_ids" {
  type        = list(string)
  default     = []
  description = "Extra Entra object IDs with Key Vault secret Get/List (e.g. GitHub Actions AZURE_CLIENT_ID service principal)."
}
