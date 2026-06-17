variable "project_id" {
  type = string
  default = "nodal-time-474015-p5"
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "zone" {
  type    = string
  default = "us-central1-a"
}

variable "integration_runner_service_account_email" {
  type        = string
  default     = "gha-deployer@nodal-time-474015-p5.iam.gserviceaccount.com"
  description = "Service account that runs integration tests in CI (e.g. gha-deployer@PROJECT.iam.gserviceaccount.com). Granted secretAccessor on the fixture secret."
}
