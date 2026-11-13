import type { ExampleSource } from "../index";

/** Azure (Azure Monitor, Log Analytics) variants of each example. */
export const EXAMPLES: ExampleSource[] = [
  {
    example: "basic",
    description:
      "A Log Analytics workspace and archive storage account receiving the subscription's Activity Log, all on defaults. Audit events are captured, but there are no flow logs, retention is 30 days, the archive can be made public and nothing alerts on tampering.",
    code: `provider "azurerm" {
  features {}
}

data "azurerm_subscription" "current" {}

resource "azurerm_resource_group" "logs" {
  name     = "rg-central-logs"
  location = "uksouth"
}

resource "azurerm_log_analytics_workspace" "central" {
  name                = "law-central"
  resource_group_name = azurerm_resource_group.logs.name
  location            = azurerm_resource_group.logs.location
  sku                 = "PerGB2018"
}

resource "azurerm_storage_account" "archive" {
  name                     = "acmelogarchive"
  resource_group_name      = azurerm_resource_group.logs.name
  location                 = azurerm_resource_group.logs.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_monitor_diagnostic_setting" "activity_log" {
  name                       = "activity-log"
  target_resource_id         = data.azurerm_subscription.current.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.central.id
  storage_account_id         = azurerm_storage_account.archive.id

  enabled_log {
    category = "Administrative"
  }

  enabled_log {
    category = "Security"
  }
}
`,
  },
  {
    example: "intermediate",
    description:
      "Adds VNet flow logs, a private HTTPS-only archive with a one-year lifecycle, and an alert when a diagnostic setting is deleted. The workspace still keeps only 90 days, nothing is immutable or encrypted with your own key, and log queries aren't monitored.",
    code: `provider "azurerm" {
  features {}
}

variable "vnet_id" {
  type = string
}

data "azurerm_subscription" "current" {}

resource "azurerm_resource_group" "logs" {
  name     = "rg-central-logs"
  location = "uksouth"
}

resource "azurerm_log_analytics_workspace" "central" {
  name                = "law-central"
  resource_group_name = azurerm_resource_group.logs.name
  location            = azurerm_resource_group.logs.location
  sku                 = "PerGB2018"
  retention_in_days   = 90
}

resource "azurerm_storage_account" "archive" {
  name                            = "acmelogarchive"
  resource_group_name             = azurerm_resource_group.logs.name
  location                        = azurerm_resource_group.logs.location
  account_tier                    = "Standard"
  account_replication_type        = "ZRS"
  min_tls_version                 = "TLS1_2"
  https_traffic_only_enabled      = true
  allow_nested_items_to_be_public = false
}

resource "azurerm_storage_management_policy" "archive" {
  storage_account_id = azurerm_storage_account.archive.id
  rule {
    name    = "expire-after-one-year"
    enabled = true
    filters {
      blob_types = ["blockBlob", "appendBlob"]
    }
    actions {
      base_blob {
        delete_after_days_since_creation_greater_than = 365
      }
    }
  }
}

resource "azurerm_monitor_diagnostic_setting" "activity_log" {
  name                       = "activity-log"
  target_resource_id         = data.azurerm_subscription.current.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.central.id
  storage_account_id         = azurerm_storage_account.archive.id

  enabled_log {
    category = "Administrative"
  }

  enabled_log {
    category = "Security"
  }
}

resource "azurerm_network_watcher_flow_log" "vnet" {
  name                 = "vnet-flow-log"
  network_watcher_name = "NetworkWatcher_uksouth"
  resource_group_name  = "NetworkWatcherRG"
  target_resource_id   = var.vnet_id
  storage_account_id   = azurerm_storage_account.archive.id
  enabled              = true

  retention_policy {
    enabled = true
    days    = 365
  }

  traffic_analytics {
    enabled               = true
    workspace_id          = azurerm_log_analytics_workspace.central.workspace_id
    workspace_region      = azurerm_log_analytics_workspace.central.location
    workspace_resource_id = azurerm_log_analytics_workspace.central.id
  }
}

resource "azurerm_monitor_action_group" "security" {
  name                = "security-alerts"
  resource_group_name = azurerm_resource_group.logs.name
  short_name          = "security"

  email_receiver {
    name          = "soc"
    email_address = "soc@example.com"
  }
}

resource "azurerm_monitor_activity_log_alert" "diag_deleted" {
  name                = "diagnostic-setting-deleted"
  resource_group_name = azurerm_resource_group.logs.name
  location            = "global"
  scopes              = [data.azurerm_subscription.current.id]

  criteria {
    category       = "Administrative"
    operation_name = "Microsoft.Insights/diagnosticSettings/delete"
  }

  action {
    action_group_id = azurerm_monitor_action_group.security.id
  }
}
`,
  },
  {
    example: "hardened",
    description:
      "A CMK-encrypted workspace that keeps a year of logs and exports them to a locked, immutable archive, with flow logs, a delete lock, and alerts on logging tampering and unusual query volume. Satisfies every statically checkable requirement at TLP:AMBER.",
    code: `provider "azurerm" {
  features {}
}

variable "vnet_id" {
  type = string
}

# Key Vault key, and a user-assigned identity allowed to use it
variable "cmk_key_id" {
  type = string
}

variable "cmk_identity_id" {
  type = string
}

data "azurerm_subscription" "current" {}

resource "azurerm_resource_group" "logs" {
  name     = "rg-central-logs"
  location = "uksouth" # CCC.Core.CN06: trusted region
}

resource "azurerm_log_analytics_workspace" "central" {
  name                = "law-central"
  resource_group_name = azurerm_resource_group.logs.name
  location            = azurerm_resource_group.logs.location
  sku                 = "PerGB2018"
  retention_in_days   = 365 # CCC.Logging.CN02
}

# CCC.Core.CN11: a dedicated cluster gives the workspace a customer-managed key
resource "azurerm_log_analytics_cluster" "central" {
  name                = "lac-central"
  resource_group_name = azurerm_resource_group.logs.name
  location            = azurerm_resource_group.logs.location
  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_log_analytics_cluster_customer_managed_key" "central" {
  log_analytics_cluster_id = azurerm_log_analytics_cluster.central.id
  key_vault_key_id         = var.cmk_key_id
}

resource "azurerm_log_analytics_linked_service" "cluster" {
  resource_group_name = azurerm_resource_group.logs.name
  workspace_id        = azurerm_log_analytics_workspace.central.id
  write_access_id     = azurerm_log_analytics_cluster.central.id
}

resource "azurerm_management_lock" "workspace" {
  name       = "protect-central-logs"
  scope      = azurerm_log_analytics_workspace.central.id
  lock_level = "CanNotDelete" # CCC.Core.CN09
}

resource "azurerm_storage_account" "archive" {
  name                            = "acmelogarchive"
  resource_group_name             = azurerm_resource_group.logs.name
  location                        = azurerm_resource_group.logs.location
  account_tier                    = "Standard"
  account_replication_type        = "ZRS"
  https_traffic_only_enabled      = true  # CCC.Core.CN01
  allow_nested_items_to_be_public = false # CCC.Logging.CN05
  identity {
    type         = "UserAssigned"
    identity_ids = [var.cmk_identity_id]
  }
  customer_managed_key {
    key_vault_key_id          = var.cmk_key_id # CCC.Core.CN11
    user_assigned_identity_id = var.cmk_identity_id
  }
  blob_properties {
    versioning_enabled = true
  }
  immutability_policy {
    state                         = "Locked" # CCC.Logging.CN03: WORM, can't be removed
    period_since_creation_in_days = 365
    allow_protected_append_writes = true
  }
}

resource "azurerm_storage_management_policy" "archive" {
  storage_account_id = azurerm_storage_account.archive.id
  rule {
    name    = "expire-after-retention"
    enabled = true
    filters {
      blob_types = ["blockBlob", "appendBlob"]
    }
    actions {
      base_blob {
        delete_after_days_since_creation_greater_than = 365 # CCC.Logging.CN02
      }
    }
  }
}

resource "azurerm_log_analytics_data_export_rule" "archive" {
  name                    = "export-to-immutable-archive"
  resource_group_name     = azurerm_resource_group.logs.name
  workspace_resource_id   = azurerm_log_analytics_workspace.central.id
  destination_resource_id = azurerm_storage_account.archive.id
  table_names             = ["AzureActivity", "LAQueryLogs", "NTANetAnalytics"]
  enabled                 = true
}

# CCC.Logging.CN01: Activity Log and flow logs to the central workspace
resource "azurerm_monitor_diagnostic_setting" "activity_log" {
  name                       = "activity-log"
  target_resource_id         = data.azurerm_subscription.current.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.central.id
  enabled_log {
    category = "Administrative"
  }
}

resource "azurerm_network_watcher_flow_log" "vnet" {
  name                 = "vnet-flow-log"
  network_watcher_name = "NetworkWatcher_uksouth"
  resource_group_name  = "NetworkWatcherRG"
  target_resource_id   = var.vnet_id
  storage_account_id   = azurerm_storage_account.archive.id
  enabled              = true
  traffic_analytics {
    enabled               = true
    workspace_id          = azurerm_log_analytics_workspace.central.workspace_id
    workspace_region      = azurerm_log_analytics_workspace.central.location
    workspace_resource_id = azurerm_log_analytics_workspace.central.id
  }
}

# Records every query against the workspace in LAQueryLogs
resource "azurerm_monitor_diagnostic_setting" "query_audit" {
  name                       = "query-audit"
  target_resource_id         = azurerm_log_analytics_workspace.central.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.central.id
  enabled_log {
    category = "Audit"
  }
}

resource "azurerm_monitor_action_group" "security" {
  name                = "security-alerts"
  resource_group_name = azurerm_resource_group.logs.name
  short_name          = "security"
  email_receiver {
    name          = "soc"
    email_address = "soc@example.com"
  }
}

# CCC.Logging.CN07: alert when logging is switched off
resource "azurerm_monitor_activity_log_alert" "diag_deleted" {
  name                = "diagnostic-setting-deleted"
  resource_group_name = azurerm_resource_group.logs.name
  location            = "global"
  scopes              = [data.azurerm_subscription.current.id]
  criteria {
    category       = "Administrative"
    operation_name = "Microsoft.Insights/diagnosticSettings/delete"
  }
  action {
    action_group_id = azurerm_monitor_action_group.security.id
  }
}

# CCC.Logging.CN06: alert when one principal runs an unusual number of queries
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "query_volume" {
  name                 = "unusual-log-query-volume"
  resource_group_name  = azurerm_resource_group.logs.name
  location             = azurerm_resource_group.logs.location
  scopes               = [azurerm_log_analytics_workspace.central.id]
  severity             = 2
  evaluation_frequency = "PT15M"
  window_duration      = "PT1H"
  criteria {
    query                   = "LAQueryLogs | summarize Queries = count() by AADObjectId"
    time_aggregation_method = "Maximum"
    metric_measure_column   = "Queries"
    operator                = "GreaterThan"
    threshold               = 200
  }
  action {
    action_groups = [azurerm_monitor_action_group.security.id]
  }
}
`,
  },
];
