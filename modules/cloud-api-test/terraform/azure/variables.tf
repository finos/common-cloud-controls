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
