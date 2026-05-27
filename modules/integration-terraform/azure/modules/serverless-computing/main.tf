resource "random_string" "suffix" {
  length  = 6
  upper   = false
  numeric = true
  special = false
}

resource "azurerm_storage_account" "func" {
  name                     = "cfi${var.deployment_suffix}${random_string.suffix.result}"
  resource_group_name      = var.resource_group
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
}

resource "azurerm_service_plan" "this" {
  name                = "cfi-${var.deployment_suffix}-func-plan"
  resource_group_name = var.resource_group
  location            = var.location
  os_type             = "Linux"
  sku_name            = "Y1"
}

resource "azurerm_linux_function_app" "good" {
  name                = "cfi-${var.deployment_suffix}-fn-good"
  resource_group_name = var.resource_group
  location            = var.location
  service_plan_id     = azurerm_service_plan.this.id

  storage_account_name       = azurerm_storage_account.func.name
  storage_account_access_key = azurerm_storage_account.func.primary_access_key
  public_network_access_enabled = false

  site_config {
    application_stack {
      python_version = "3.11"
    }
  }

  tags = merge(var.common_tags, { CFIControlSet = "CCC.SvlsComp" })
}

resource "azurerm_linux_function_app" "bad" {
  name                = "cfi-${var.deployment_suffix}-fn-bad"
  resource_group_name = var.resource_group
  location            = var.location
  service_plan_id     = azurerm_service_plan.this.id

  storage_account_name       = azurerm_storage_account.func.name
  storage_account_access_key = azurerm_storage_account.func.primary_access_key
  public_network_access_enabled = true

  site_config {
    application_stack {
      python_version = "3.11"
    }
  }

  tags = merge(var.common_tags, { CFIControlSet = "CCC.SvlsComp" })
}
