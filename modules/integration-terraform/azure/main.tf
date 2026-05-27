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
  name     = "finos-ccc-integration-${var.deployment_suffix}-rg"
  location = var.location
  tags     = local.common_tags
}

module "virtual_machines" {
  source            = "./modules/virtual-machines"
  deployment_suffix = var.deployment_suffix
  location          = var.location
  resource_group    = azurerm_resource_group.this.name
  common_tags       = local.common_tags
}

module "serverless_computing" {
  source            = "./modules/serverless-computing"
  deployment_suffix = var.deployment_suffix
  location          = var.location
  resource_group    = azurerm_resource_group.this.name
  common_tags       = local.common_tags
}
