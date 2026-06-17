variable "common_tags" {
  type        = map(string)
  description = "Tags applied to secrets manager resources."
}

variable "unauthorized_region" {
  type        = string
  description = "Region used for CN02 negative tests (must differ from provider region)."
  default     = "eu-west-1"
}
