resource "azurerm_log_analytics_workspace" "main" {
  name                = "finos-ccc-integration-law"
  location            = var.location
  resource_group_name = var.resource_group
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = var.common_tags
}

data "azurerm_monitor_diagnostic_categories" "storage" {
  resource_id = var.storage_account_id
}

resource "azurerm_monitor_diagnostic_setting" "storage" {
  name                       = "finos-ccc-integration-storage-diag"
  target_resource_id         = var.storage_account_id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  dynamic "enabled_log" {
    for_each = toset(data.azurerm_monitor_diagnostic_categories.storage.log_category_types)
    content {
      category = enabled_log.value
    }
  }

  dynamic "metric" {
    for_each = toset(data.azurerm_monitor_diagnostic_categories.storage.metric_category_types)
    content {
      category = metric.value
      enabled  = true
    }
  }
}

data "azurerm_monitor_diagnostic_categories" "vm" {
  resource_id = var.vm_id
}

resource "azurerm_monitor_diagnostic_setting" "vm" {
  name                       = "finos-ccc-integration-vm-diag"
  target_resource_id         = var.vm_id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  dynamic "enabled_log" {
    for_each = toset(data.azurerm_monitor_diagnostic_categories.vm.log_category_types)
    content {
      category = enabled_log.value
    }
  }

  dynamic "metric" {
    for_each = toset(data.azurerm_monitor_diagnostic_categories.vm.metric_category_types)
    content {
      category = metric.value
      enabled  = true
    }
  }
}

data "azurerm_monitor_diagnostic_categories" "function_app" {
  resource_id = var.function_app_id
}

resource "azurerm_monitor_diagnostic_setting" "function_app" {
  name                       = "finos-ccc-integration-fn-diag"
  target_resource_id         = var.function_app_id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  dynamic "enabled_log" {
    for_each = toset(data.azurerm_monitor_diagnostic_categories.function_app.log_category_types)
    content {
      category = enabled_log.value
    }
  }

  dynamic "metric" {
    for_each = toset(data.azurerm_monitor_diagnostic_categories.function_app.metric_category_types)
    content {
      category = metric.value
      enabled  = true
    }
  }
}

resource "azurerm_network_watcher" "main" {
  name                = "finos-ccc-integration-nw"
  location            = var.location
  resource_group_name = var.resource_group
  tags                = var.common_tags
}

resource "azurerm_network_watcher_flow_log" "vm_nsg" {
  name                 = "finos-ccc-integration-vm-nsg-flowlog"
  network_watcher_name = azurerm_network_watcher.main.name
  resource_group_name  = var.resource_group
  network_security_group_id = var.vm_network_security_group_id
  storage_account_id        = var.storage_account_id
  enabled                   = true
  version                   = 2
  retention_policy {
    enabled = true
    days    = 7
  }

  traffic_analytics {
    enabled               = true
    workspace_id          = azurerm_log_analytics_workspace.main.workspace_id
    workspace_region      = azurerm_log_analytics_workspace.main.location
    workspace_resource_id = azurerm_log_analytics_workspace.main.id
    interval_in_minutes   = 10
  }
}
