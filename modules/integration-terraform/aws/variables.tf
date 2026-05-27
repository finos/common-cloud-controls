variable "region" {
  type    = string
  default = "us-east-1"
}

variable "deployment_suffix" {
  type        = string
  description = "Name suffix for fixture resources"
}

variable "vm_instance_type" {
  type    = string
  default = "t3.micro"
}
