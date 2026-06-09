provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

data "azurerm_client_config" "current" {}

data "azuread_service_principal" "integration_runner" {
  count     = var.integration_runner_client_id != "" ? 1 : 0
  client_id = var.integration_runner_client_id
}

locals {
  common_tags = {
    ManagedBy = "Terraform"
    Project   = "CCC-CFI-Compliance"
  }

  key_vault_secret_reader_object_ids = distinct(compact(concat(
    var.key_vault_secret_reader_object_ids,
    var.integration_runner_client_id != "" ? [data.azuread_service_principal.integration_runner[0].object_id] : [],
  )))
}

resource "azurerm_resource_group" "this" {
  name     = "finos-ccc-integration-rg"
  location = var.location
  tags     = local.common_tags
}

module "vpc" {
  source         = "./modules/vpc"
  location       = var.location
  resource_group = azurerm_resource_group.this.name
  common_tags    = local.common_tags
}

module "virtual_machines" {
  source         = "./modules/virtual-machines"
  location         = var.location
  resource_group = azurerm_resource_group.this.name
  subnet_id      = module.vpc.vm_subnet_id
  common_tags    = local.common_tags
}

module "serverless_computing" {
  count          = var.enable_serverless_computing ? 1 : 0
  source         = "./modules/serverless-computing"
  location       = var.location
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
  source                        = "./modules/logging"
  location                      = var.location
  resource_group                = azurerm_resource_group.this.name
  storage_account_id            = module.object_storage.storage_account_id
  storage_account_name          = module.object_storage.storage_account_name
  vm_id                         = module.virtual_machines.vm_id
  vm_network_security_group_id = module.virtual_machines.nsg_id
  function_app_id               = var.enable_serverless_computing ? module.serverless_computing[0].function_app_id : null
  common_tags                   = local.common_tags
}

module "secrets" {
  source                   = "./modules/secrets"
  location                 = var.location
  resource_group           = azurerm_resource_group.this.name
  key_vault_name           = "finoscccintkvsec"
  common_tags              = local.common_tags
  unauthorized_region      = "westeurope"
  secret_reader_object_ids = local.key_vault_secret_reader_object_ids
}

module "gen_ai" {
  source      = "./modules/gen-ai"
  common_tags = local.common_tags
}
