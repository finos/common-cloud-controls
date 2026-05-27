provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

locals {
  common_labels = {
    managed_by = "terraform"
    project    = "ccc-cfi-compliance"
  }
}

module "virtual_machines" {
  source            = "./modules/virtual-machines"
  project_id        = var.project_id
  region            = var.region
  zone              = var.zone
  deployment_suffix = var.deployment_suffix
  common_labels     = local.common_labels
}

module "serverless_computing" {
  source            = "./modules/serverless-computing"
  project_id        = var.project_id
  region            = var.region
  deployment_suffix = var.deployment_suffix
  common_labels     = local.common_labels
}
