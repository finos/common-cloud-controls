provider "aws" {
  region = var.region
}

locals {
  common_tags = {
    ManagedBy = "Terraform"
    Project   = "CCC-CFI-Compliance"
  }
}

module "virtual_machines" {
  source            = "./modules/virtual-machines"
  deployment_suffix = var.deployment_suffix
  instance_type     = var.vm_instance_type
  common_tags       = local.common_tags
}

module "serverless_computing" {
  source            = "./modules/serverless-computing"
  deployment_suffix = var.deployment_suffix
  common_tags       = local.common_tags
}

module "vpc" {
  source            = "./modules/vpc"
  deployment_suffix = var.deployment_suffix
  common_tags       = local.common_tags
}
