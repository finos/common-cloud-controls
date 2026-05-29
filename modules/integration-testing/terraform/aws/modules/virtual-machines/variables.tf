variable "instance_type" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "common_tags" {
  type = map(string)
}
