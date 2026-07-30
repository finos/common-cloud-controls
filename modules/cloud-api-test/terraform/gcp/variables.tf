variable "project_id" {
  type    = string
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

variable "k8s_api_authorized_cidrs" {
  type        = list(string)
  description = <<-EOT
    Master authorized networks for finos-ccc-integration-k8s-main (CN01).
    Prerequisite: include runner egress; exclude reachability-probe public egress.
    Also requires container.googleapis.com, cloudkms, and binaryauthorization APIs.
  EOT
  default     = ["10.0.0.0/8"]
}
