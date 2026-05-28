variable "location" {
  type = string
}

variable "resource_group" {
  type = string
}

variable "storage_account_id" {
  type = string
}

variable "storage_account_name" {
  type = string
}

variable "vm_id" {
  type = string
}

variable "vm_network_security_group_id" {
  type = string
}

variable "function_app_id" {
  type = string
}

variable "common_tags" {
  type = map(string)
}
