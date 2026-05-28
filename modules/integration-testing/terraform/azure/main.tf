provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

locals {
  common_tags = {
    ManagedBy = "Terraform"
    Project   = "CCC-CFI-Compliance"
  }
}

resource "azurerm_resource_group" "this" {
  name     = "finos-ccc-integration-rg"
  location = var.location
  tags     = local.common_tags
}

module "virtual_machines" {
  source         = "./modules/virtual-machines"
  location         = var.location
  resource_group = azurerm_resource_group.this.name
  common_tags    = local.common_tags
}

module "serverless_computing" {
  source         = "./modules/serverless-computing"
  location         = var.location
  resource_group = azurerm_resource_group.this.name
  common_tags    = local.common_tags
}

module "object_storage" {
  source         = "./modules/object-storage"
  location       = var.location
  resource_group = azurerm_resource_group.this.name
  common_tags    = local.common_tags
}

module "logging" {
  source                  = "./modules/logging"
  location                = var.location
  resource_group          = azurerm_resource_group.this.name
  storage_account_id      = module.object_storage.storage_account_id
  storage_account_name    = module.object_storage.storage_account_name
  vm_id                   = module.virtual_machines.vm_id
  vm_network_security_group_id = module.virtual_machines.nsg_id
  function_app_id         = module.serverless_computing.function_app_id
  common_tags             = local.common_tags
}
