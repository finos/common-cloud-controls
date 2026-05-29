variable "location" { type = string }
variable "resource_group" { type = string }
variable "subnet_id" { type = string }
variable "common_tags" { type = map(string) }

variable "vm_size" {
  type        = string
  default     = "Standard_B1ls_v2"
  description = "Small Gen2 burstable (Bsv2) size for integration fixtures; override if unavailable in region."
}

variable "encryption_at_host_enabled" {
  type        = bool
  default     = false
  description = "Set true only when Microsoft.Compute/EncryptionAtHost is enabled on the subscription."
}
