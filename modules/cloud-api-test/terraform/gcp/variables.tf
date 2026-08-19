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

variable "k8s_api_authorized_cidrs" {
  type        = list(string)
  description = <<-EOT
    Master authorized networks for finos-ccc-integration-k8s-main (CN01).
    Prerequisite: include runner egress; exclude reachability-probe public egress.
    Leave empty to auto-detect the applying machine's public IP as a /32 so the
    applying runner can still reach the public control plane.
    Also requires container.googleapis.com, cloudkms, and binaryauthorization APIs.
  EOT
  default     = []
}
