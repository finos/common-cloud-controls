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
