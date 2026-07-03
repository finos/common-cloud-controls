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
  type     = string
  default  = null
  nullable = true
}

variable "common_tags" {
  type = map(string)
}

variable "enable_legacy_nsg_flow_logs" {
  type        = bool
  default     = false
  description = "NSG flow logs creation is retired in Azure; keep false unless targeting legacy subscriptions."
}
