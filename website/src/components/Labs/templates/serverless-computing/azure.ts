import type { ExampleSource } from "../index";

/** Azure (Azure Functions) variants of each example. */
export const EXAMPLES: ExampleSource[] = [
  {
    example: "basic",
    description: "A Linux function app on the Consumption plan with provider defaults: public, plain HTTP allowed and no logging. A good place to start fixing things.",
    code: `provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "orders" {
  name     = "rg-orders-api"
  location = "uksouth"
}

resource "azurerm_storage_account" "orders" {
  name                     = "stordersapifn"
  resource_group_name      = azurerm_resource_group.orders.name
  location                 = azurerm_resource_group.orders.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_service_plan" "orders" {
  name                = "asp-orders-api"
  resource_group_name = azurerm_resource_group.orders.name
  location            = azurerm_resource_group.orders.location
  os_type             = "Linux"
  sku_name            = "Y1"
}

resource "azurerm_linux_function_app" "orders" {
  name                       = "func-orders-api"
  resource_group_name        = azurerm_resource_group.orders.name
  location                   = azurerm_resource_group.orders.location
  service_plan_id            = azurerm_service_plan.orders.id
  storage_account_name       = azurerm_storage_account.orders.name
  storage_account_access_key = azurerm_storage_account.orders.primary_access_key

  site_config {
    application_stack {
      python_version = "3.12"
    }
  }
}
`,
  },
  {
    example: "intermediate",
    description:
      "HTTPS-only with TLS 1.2, a scale-out cap, Application Insights and an IP allow-list. The app still has a public endpoint, no mTLS or built-in authentication, and the Activity Log isn't exported.",
    code: `provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "orders" {
  name     = "rg-orders-api"
  location = "uksouth"
}

resource "azurerm_storage_account" "orders" {
  name                     = "stordersapifn"
  resource_group_name      = azurerm_resource_group.orders.name
  location                 = azurerm_resource_group.orders.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
}

resource "azurerm_service_plan" "orders" {
  name                = "asp-orders-api"
  resource_group_name = azurerm_resource_group.orders.name
  location            = azurerm_resource_group.orders.location
  os_type             = "Linux"
  sku_name            = "Y1"
}

resource "azurerm_application_insights" "orders" {
  name                = "appi-orders-api"
  resource_group_name = azurerm_resource_group.orders.name
  location            = azurerm_resource_group.orders.location
  application_type    = "web"
}

resource "azurerm_linux_function_app" "orders" {
  name                       = "func-orders-api"
  resource_group_name        = azurerm_resource_group.orders.name
  location                   = azurerm_resource_group.orders.location
  service_plan_id            = azurerm_service_plan.orders.id
  storage_account_name       = azurerm_storage_account.orders.name
  storage_account_access_key = azurerm_storage_account.orders.primary_access_key
  https_only                 = true

  site_config {
    minimum_tls_version                    = "1.2"
    app_scale_limit                        = 20
    application_insights_connection_string = azurerm_application_insights.orders.connection_string

    # Only the corporate network may call the app, but it is still public.
    ip_restriction {
      name       = "corporate"
      ip_address = "203.0.113.0/24"
      action     = "Allow"
      priority   = 100
    }

    application_stack {
      python_version = "3.12"
    }
  }
}
`,
  },
  {
    example: "hardened",
    description:
      "A Premium-plan function app reachable only through a private endpoint, with TLS 1.3, mTLS, Entra ID authentication, a scale-out cap, and invocation and Activity Log exports to Log Analytics.",
    code: `provider "azurerm" {
  features {}
}

variable "client_id" {
  description = "Entra ID app registration that callers authenticate against."
  type        = string
}

data "azurerm_client_config" "current" {}
data "azurerm_subscription" "current" {}

resource "azurerm_resource_group" "orders" {
  name     = "rg-orders-api"
  location = "uksouth" # CCC.Core.CN06: trusted region
}

resource "azurerm_virtual_network" "orders" {
  name                = "vnet-orders"
  resource_group_name = azurerm_resource_group.orders.name
  location            = azurerm_resource_group.orders.location
  address_space       = ["10.20.0.0/16"]
}

resource "azurerm_subnet" "endpoints" {
  name                 = "snet-endpoints"
  resource_group_name  = azurerm_resource_group.orders.name
  virtual_network_name = azurerm_virtual_network.orders.name
  address_prefixes     = ["10.20.1.0/24"]
}

resource "azurerm_storage_account" "orders" {
  name                     = "stordersapifn"
  resource_group_name      = azurerm_resource_group.orders.name
  location                 = azurerm_resource_group.orders.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
}

resource "azurerm_service_plan" "orders" {
  name                = "asp-orders-api"
  resource_group_name = azurerm_resource_group.orders.name
  location            = azurerm_resource_group.orders.location
  os_type             = "Linux"
  sku_name            = "EP1"
}

resource "azurerm_linux_function_app" "orders" {
  name                          = "func-orders-api"
  resource_group_name           = azurerm_resource_group.orders.name
  location                      = azurerm_resource_group.orders.location
  service_plan_id               = azurerm_service_plan.orders.id
  storage_account_name          = azurerm_storage_account.orders.name
  storage_account_access_key    = azurerm_storage_account.orders.primary_access_key
  public_network_access_enabled = false      # CCC.SvlsComp.CN01: private endpoint only
  https_only                    = true       # CCC.Core.CN01: no plain HTTP
  client_certificate_enabled    = true       # CCC.Core.CN01: mutual TLS
  client_certificate_mode       = "Required"

  site_config {
    minimum_tls_version = "1.3" # CCC.Core.CN01: TLS 1.3
    app_scale_limit     = 20    # CCC.SvlsComp.CN02: invocation cap
    application_stack {
      python_version = "3.12"
    }
  }

  # CCC.Core.CN05: reject unauthenticated callers.
  auth_settings_v2 {
    auth_enabled           = true
    require_authentication = true
    unauthenticated_action = "Return401"
    active_directory_v2 {
      client_id            = var.client_id
      tenant_auth_endpoint = "https://login.microsoftonline.com/\${data.azurerm_client_config.current.tenant_id}/v2.0"
    }
    login {}
  }
}

resource "azurerm_private_endpoint" "orders" {
  name                = "pe-func-orders-api"
  resource_group_name = azurerm_resource_group.orders.name
  location            = azurerm_resource_group.orders.location
  subnet_id           = azurerm_subnet.endpoints.id

  private_service_connection {
    name                           = "func-orders-api"
    private_connection_resource_id = azurerm_linux_function_app.orders.id
    subresource_names              = ["sites"]
    is_manual_connection           = false
  }
}

resource "azurerm_log_analytics_workspace" "logs" {
  name                = "log-orders-api"
  resource_group_name = azurerm_resource_group.orders.name
  location            = azurerm_resource_group.orders.location
  retention_in_days   = 365
}

# CCC.Core.CN04 / CN09: invocations logged to a separate workspace.
resource "azurerm_monitor_diagnostic_setting" "orders" {
  name                       = "func-orders-api-logs"
  target_resource_id         = azurerm_linux_function_app.orders.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.logs.id
  enabled_log {
    category = "FunctionAppLogs"
  }
}

# CCC.Core.CN04: keep management events beyond the 90-day Activity Log.
resource "azurerm_monitor_diagnostic_setting" "activity_log" {
  name                       = "activity-log-export"
  target_resource_id         = data.azurerm_subscription.current.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.logs.id
  enabled_log {
    category = "Administrative"
  }
}
`,
  },
];
