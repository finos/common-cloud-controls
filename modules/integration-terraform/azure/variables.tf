variable "location" {
  type    = string
  default = "eastus"
}

variable "deployment_suffix" {
  type = string
}

variable "subscription_id" {
  type        = string
  description = "Azure subscription id"
}
