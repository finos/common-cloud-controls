variable "project_id" {
  type    = string
  default = "nodal-time-474015-p5"
}

variable "region" {
  type    = string
  default = "us-east1"
}

variable "zone" {
  type    = string
  default = "us-east1-b"
}

variable "integration_runner_service_account_email" {
  type        = string
  default     = "gha-deployer@nodal-time-474015-p5.iam.gserviceaccount.com"
  description = "Service account that runs integration tests in CI (e.g. gha-deployer@PROJECT.iam.gserviceaccount.com). Granted secretAccessor on the fixture secret."
}

variable "webhook_probe_image" {
  type        = string
  description = <<-EOT
    Container image for the in-cluster CN11.AR03 admission-webhook probe.
    Default is a pause stand-in so the Deployment exists; pin a real probe digest before behavioural CN11.AR03 runs.
  EOT
  default     = "registry.k8s.io/pause:3.9"
}
