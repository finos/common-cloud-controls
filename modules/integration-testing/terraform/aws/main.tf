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
  source        = "./modules/virtual-machines"
  instance_type = var.vm_instance_type
  common_tags   = local.common_tags
}

module "serverless_computing" {
  source      = "./modules/serverless-computing"
  common_tags = local.common_tags
}

module "vpc" {
  source      = "./modules/vpc"
  common_tags = local.common_tags
}
