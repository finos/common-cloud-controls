variable "project_id" {
  type        = string
  description = "GCP project id."
}

variable "region" {
  type        = string
  description = "Regional location for the secret."
}

variable "common_tags" {
  type        = map(string)
  description = "Labels applied to secret manager resources."
}

variable "unauthorized_region" {
  type        = string
  description = "Region used for CN02 negative tests."
  default     = "europe-west1"
}
