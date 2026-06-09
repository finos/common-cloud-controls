variable "location" { type = string }
variable "resource_group" { type = string }
variable "subnet_id" { type = string }
variable "common_tags" { type = map(string) }

variable "vm_size" {
  type        = string
  default     = "Standard_B1s"
  description = "General-purpose size for integration fixtures; B-series often lacks capacity in westus2. Override via TF_VAR_vm_size."
}

variable "encryption_at_host_enabled" {
  type        = bool
  default     = false
  description = "Set true only when Microsoft.Compute/EncryptionAtHost is enabled on the subscription."
}
