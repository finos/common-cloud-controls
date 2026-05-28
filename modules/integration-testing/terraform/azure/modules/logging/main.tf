resource "azurerm_log_analytics_workspace" "main" {
  name                = "finos-ccc-integration-law"
  location            = var.location
  resource_group_name = var.resource_group
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = var.common_tags
}

resource "azurerm_monitor_diagnostic_setting" "storage" {
  name                       = "finos-ccc-integration-storage-diag"
  # Storage data-plane categories (StorageRead/Write/Delete) are exposed on
  # the blob service child resource, not the storage-account root.
  target_resource_id         = "${var.storage_account_id}/blobServices/default"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "StorageRead"
  }

  enabled_log {
    category = "StorageWrite"
  }

  enabled_log {
    category = "StorageDelete"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

resource "azurerm_monitor_diagnostic_setting" "vm" {
  name                       = "finos-ccc-integration-vm-diag"
  target_resource_id         = var.vm_id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category_group = "allLogs"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

resource "azurerm_monitor_diagnostic_setting" "function_app" {
  count = var.function_app_id != null && var.function_app_id != "" ? 1 : 0

  name                       = "finos-ccc-integration-fn-diag"
  target_resource_id         = var.function_app_id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category_group = "allLogs"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

resource "azurerm_network_watcher" "main" {
  name                = "finos-ccc-integration-nw"
  location            = var.location
  resource_group_name = var.resource_group
  tags                = var.common_tags
}

resource "azurerm_network_watcher_flow_log" "vm_nsg" {
  count = var.enable_legacy_nsg_flow_logs ? 1 : 0

  name                      = "finos-ccc-integration-vm-nsg-flowlog"
  network_watcher_name      = azurerm_network_watcher.main.name
  resource_group_name       = var.resource_group
  network_security_group_id = var.vm_network_security_group_id
  storage_account_id         = var.storage_account_id
  enabled                    = true
  version                    = 2
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
