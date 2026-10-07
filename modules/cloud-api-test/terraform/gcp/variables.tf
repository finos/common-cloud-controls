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
    CI/deploy-gcp.sh also kubectl-sets the live Deployment to the just-pushed Artifact Registry digest.
  EOT
  default     = "us-central1-docker.pkg.dev/nodal-time-474015-p5/finos-ccc-probes/finos-ccc-admission-webhook-probe@sha256:6f8d2c45f6f69852bee7df1c71483b3502471de95be924df113c4e5e6477bbb8"
}
