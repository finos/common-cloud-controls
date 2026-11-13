import type { ExampleSource } from "../index";

/** Azure (Blob Storage, azurerm provider) variants of each example. */
export const EXAMPLES: ExampleSource[] = [
  {
    example: "basic",
    description: "A bare storage account and private container relying on azurerm defaults. A good place to start fixing things.",
    code: `provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "acme-trading"
  location = "uksouth"
}

resource "azurerm_storage_account" "data" {
  name                     = "acmetradingdata"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "data" {
  name               = "data"
  storage_account_id = azurerm_storage_account.data.id
}
`,
  },
  {
    example: "intermediate",
    description:
      "A common Blob Storage baseline: zone-redundant, HTTPS-only, no anonymous access, versioning and soft delete, with blob logs sent to a workspace. It still uses Microsoft-managed keys and allows shared keys, with no immutability, SAS policy or tiering.",
    code: `provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "acme-trading"
  location = "uksouth"
}

resource "azurerm_storage_account" "data" {
  name                     = "acmetradingdata"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "ZRS"

  min_tls_version                 = "TLS1_2"
  https_traffic_only_enabled      = true
  allow_nested_items_to_be_public = false

  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 14
    }

    container_delete_retention_policy {
      days = 14
    }
  }
}

resource "azurerm_storage_container" "data" {
  name                  = "data"
  storage_account_id    = azurerm_storage_account.data.id
  container_access_type = "private"
}

resource "azurerm_log_analytics_workspace" "audit" {
  name                = "acme-audit"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  retention_in_days   = 90
}

resource "azurerm_monitor_diagnostic_setting" "blob" {
  name                       = "blob-data-plane"
  target_resource_id         = "\${azurerm_storage_account.data.id}/blobServices/default"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.audit.id

  enabled_log {
    category = "StorageWrite"
  }
  enabled_log {
    category = "StorageDelete"
  }
}
`,
  },
  {
    example: "hardened",
    description:
      "A storage account configured to satisfy as many statically-checkable requirements as Azure allows at TLP:AMBER. Azure has no MFA-delete setting, so that control can only be partly met.",
    code: `provider "azurerm" {
  features {}
}

data "azurerm_client_config" "current" {}
data "azurerm_subscription" "current" {}

resource "azurerm_resource_group" "main" {
  name     = "acme-trading"
  location = "uksouth"
}

# ── Customer-managed key ──────────────────────────────────

resource "azurerm_key_vault" "main" {
  name                       = "acme-trading-kv"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "premium"
  purge_protection_enabled   = true
  soft_delete_retention_days = 90
}

resource "azurerm_key_vault_key" "data" {
  name         = "acme-trading-data"
  key_vault_id = azurerm_key_vault.main.id
  key_type     = "RSA-HSM"
  key_size     = 3072
  key_opts     = ["wrapKey", "unwrapKey"]
}

# ── Storage account ───────────────────────────────────────

resource "azurerm_storage_account" "data" {
  name                     = "acmetradingdata"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GZRS" # secondary copy in ukwest

  min_tls_version                 = "TLS1_2" # use TLS1_3 where your provider and region support it
  https_traffic_only_enabled      = true
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false
  public_network_access_enabled   = false

  identity {
    type = "SystemAssigned"
  }

  blob_properties {
    versioning_enabled  = true
    change_feed_enabled = true

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }
  }

  immutability_policy {
    state                         = "Locked"
    period_since_creation_in_days = 30
    allow_protected_append_writes = false
  }

  sas_policy {
    expiration_period = "0.01:00:00" # 1 hour
    expiration_action = "Block"
  }
}

resource "azurerm_storage_account_customer_managed_key" "data" {
  storage_account_id = azurerm_storage_account.data.id
  key_vault_id       = azurerm_key_vault.main.id
  key_name           = azurerm_key_vault_key.data.name
}

resource "azurerm_storage_encryption_scope" "cmk" {
  name               = "cmk"
  storage_account_id = azurerm_storage_account.data.id
  source             = "Microsoft.KeyVault"
  key_vault_key_id   = azurerm_key_vault_key.data.id
}

resource "azurerm_storage_container" "data" {
  name                              = "data"
  storage_account_id                = azurerm_storage_account.data.id
  container_access_type             = "private"
  default_encryption_scope          = azurerm_storage_encryption_scope.cmk.name
  encryption_scope_override_enabled = false
}

resource "azurerm_management_lock" "data" {
  name       = "do-not-delete"
  scope      = azurerm_storage_account.data.id
  lock_level = "CanNotDelete"
}

resource "azurerm_storage_management_policy" "data" {
  storage_account_id = azurerm_storage_account.data.id
  rule {
    name    = "tiering"
    enabled = true
    filters {
      blob_types = ["blockBlob"]
    }
    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than = 30
      }
    }
  }
}

# ── Logging ───────────────────────────────────────────────

resource "azurerm_log_analytics_workspace" "audit" {
  name                = "acme-audit"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  retention_in_days   = 365
}

resource "azurerm_monitor_diagnostic_setting" "blob" {
  name                       = "blob-data-plane"
  target_resource_id         = "\${azurerm_storage_account.data.id}/blobServices/default"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.audit.id

  enabled_log {
    category = "StorageRead"
  }
  enabled_log {
    category = "StorageWrite"
  }
  enabled_log {
    category = "StorageDelete"
  }
}

resource "azurerm_monitor_diagnostic_setting" "activity" {
  name                       = "activity-log"
  target_resource_id         = data.azurerm_subscription.current.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.audit.id

  enabled_log {
    category = "Administrative"
  }
}
`,
  },
  {
    example: "public",
    description: "A static-website storage account that opens itself to the internet, accepts plain HTTP and logs into itself. Watch the failures pile up.",
    code: `provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "web" {
  name     = "acme-marketing"
  location = "southeastasia"
}

resource "azurerm_storage_account" "site" {
  name                            = "acmemarketingsite"
  resource_group_name             = azurerm_resource_group.web.name
  location                        = azurerm_resource_group.web.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_0"
  https_traffic_only_enabled      = false
  allow_nested_items_to_be_public = true

  static_website {
    index_document = "index.html"
  }
}

resource "azurerm_storage_container" "assets" {
  name                  = "assets"
  storage_account_id    = azurerm_storage_account.site.id
  container_access_type = "container"
}

resource "azurerm_monitor_diagnostic_setting" "site" {
  name               = "site-logs"
  target_resource_id = "\${azurerm_storage_account.site.id}/blobServices/default"
  storage_account_id = azurerm_storage_account.site.id

  enabled_log {
    category = "StorageRead"
  }
}
`,
  },
  {
    example: "replicated",
    description:
      "A geo-redundant account (copied to its paired region, ukwest) that also uses object replication to a disaster-recovery account in eastasia, which isn't trusted. Try moving the DR account to westeurope.",
    code: `provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "acme-ledger"
  location = "uksouth"
}

resource "azurerm_resource_group" "dr" {
  name     = "acme-ledger-dr"
  location = "eastasia"
}

resource "azurerm_storage_account" "primary" {
  name                            = "acmeledgerprimary"
  resource_group_name             = azurerm_resource_group.main.name
  location                        = azurerm_resource_group.main.location
  account_tier                    = "Standard"
  account_replication_type        = "RAGRS"
  allow_nested_items_to_be_public = false

  blob_properties {
    versioning_enabled  = true
    change_feed_enabled = true
  }
}

resource "azurerm_storage_container" "primary" {
  name               = "ledger"
  storage_account_id = azurerm_storage_account.primary.id
}

resource "azurerm_storage_account" "replica" {
  name                            = "acmeledgerreplica"
  resource_group_name             = azurerm_resource_group.dr.name
  location                        = azurerm_resource_group.dr.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  allow_nested_items_to_be_public = false

  blob_properties {
    versioning_enabled = true
  }
}

resource "azurerm_storage_container" "replica" {
  name               = "ledger"
  storage_account_id = azurerm_storage_account.replica.id
}

resource "azurerm_storage_object_replication" "ledger" {
  source_storage_account_id      = azurerm_storage_account.primary.id
  destination_storage_account_id = azurerm_storage_account.replica.id

  rules {
    source_container_name      = azurerm_storage_container.primary.name
    destination_container_name = azurerm_storage_container.replica.name
  }
}
`,
  },
  {
    example: "datalake",
    description:
      "An ADLS Gen2 data lake with raw and curated accounts and a separate log account. Hierarchical namespace brings per-file ACLs, and shared keys are left on. Pick one account under \"Storage in scope\" to focus on it.",
    code: `provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "lake" {
  name     = "acme-lake"
  location = "westeurope"
}

# ── Raw zone ──────────────────────────────────────────────

resource "azurerm_storage_account" "raw" {
  name                            = "acmelakeraw"
  resource_group_name             = azurerm_resource_group.lake.name
  location                        = azurerm_resource_group.lake.location
  account_tier                    = "Standard"
  account_replication_type        = "ZRS"
  account_kind                    = "StorageV2"
  is_hns_enabled                  = true
  allow_nested_items_to_be_public = false
  min_tls_version                 = "TLS1_2"
}

resource "azurerm_storage_data_lake_gen2_filesystem" "raw" {
  name               = "raw"
  storage_account_id = azurerm_storage_account.raw.id
}

resource "azurerm_storage_management_policy" "raw" {
  storage_account_id = azurerm_storage_account.raw.id
  rule {
    name    = "cool-down"
    enabled = true
    filters {
      blob_types = ["blockBlob"]
    }
    actions {
      base_blob {
        tier_to_cold_after_days_since_modification_greater_than    = 30
        tier_to_archive_after_days_since_modification_greater_than = 180
      }
    }
  }
}

resource "azurerm_monitor_diagnostic_setting" "raw" {
  name               = "raw-blob-logs"
  target_resource_id = "\${azurerm_storage_account.raw.id}/blobServices/default"
  storage_account_id = azurerm_storage_account.logs.id

  enabled_log {
    category_group = "audit"
  }
}

# ── Curated zone ──────────────────────────────────────────

resource "azurerm_storage_account" "curated" {
  name                            = "acmelakecurated"
  resource_group_name             = azurerm_resource_group.lake.name
  location                        = azurerm_resource_group.lake.location
  account_tier                    = "Standard"
  account_replication_type        = "GZRS"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false
  min_tls_version                 = "TLS1_2"

  blob_properties {
    versioning_enabled = true
    container_delete_retention_policy {
      days = 14
    }
  }
}

resource "azurerm_storage_container" "curated" {
  name               = "curated"
  storage_account_id = azurerm_storage_account.curated.id
}

resource "azurerm_storage_container_immutability_policy" "curated" {
  storage_container_resource_manager_id = azurerm_storage_container.curated.id
  immutability_period_in_days           = 90
  locked                                = false
}

resource "azurerm_monitor_diagnostic_setting" "curated" {
  name               = "curated-logs"
  target_resource_id = azurerm_storage_account.curated.id # account root, not blobServices/default
  storage_account_id = azurerm_storage_account.logs.id

  metric {
    category = "Transaction"
  }
}

# ── Logs ──────────────────────────────────────────────────

resource "azurerm_storage_account" "logs" {
  name                     = "acmelakelogs"
  resource_group_name      = azurerm_resource_group.lake.name
  location                 = azurerm_resource_group.lake.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
`,
  },
];
