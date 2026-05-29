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

module "vpc" {
  source        = "./modules/vpc"
  project_id    = var.project_id
  region        = var.region
  common_labels = local.common_labels
}

module "virtual_machines" {
  source        = "./modules/virtual-machines"
  project_id    = var.project_id
  region        = var.region
  zone          = var.zone
  common_labels = local.common_labels
}

module "serverless_computing" {
  source        = "./modules/serverless-computing"
  project_id    = var.project_id
  region        = var.region
  common_labels = local.common_labels
}

module "object_storage" {
  source        = "./modules/object-storage"
  project_id    = var.project_id
  region        = var.region
  common_labels = local.common_labels
}

module "logging" {
  source     = "./modules/logging"
  project_id = var.project_id
}
