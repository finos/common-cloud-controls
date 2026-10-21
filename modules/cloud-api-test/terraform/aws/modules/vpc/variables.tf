variable "common_tags" {
  type = map(string)
}

variable "vm_instance_type" {
  type        = string
  description = "Instance type the VM subnet must have an offering for; constrains the subnet's availability zone."
}
