provider "aws" {
  region = var.region
}

locals {
  common_tags = {
    ManagedBy = "Terraform"
    Project   = "CCC-CFI-Compliance"
  }
}

module "vpc" {
  source      = "./modules/vpc"
  common_tags = local.common_tags
}

module "virtual_machines" {
  source        = "./modules/virtual-machines"
  instance_type = var.vm_instance_type
  subnet_id     = module.vpc.vm_subnet_id
  vpc_id        = module.vpc.receiver_vpc_id
  common_tags   = local.common_tags
}

module "serverless_computing" {
  source      = "./modules/serverless-computing"
  common_tags = local.common_tags
}

module "object_storage" {
  source      = "./modules/object-storage"
  common_tags = local.common_tags
}

module "logging" {
  source              = "./modules/logging"
  bucket_arn          = module.object_storage.bucket_arn
  lambda_function_arn = module.serverless_computing.function_arn
  common_tags         = local.common_tags
}
