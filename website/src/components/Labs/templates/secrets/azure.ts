import type { ExampleSource } from "../index";

/** Azure (Key Vault) variants of each example. */
export const EXAMPLES: ExampleSource[] = [
  {
    example: "basic",
    description: "A database password in a Key Vault with no expiry, so nothing ever prompts rotation; East US also replicates vault contents to its paired region, West US.",
    code: `provider "azurerm" {
  features {}
}

variable "db_password" {
  type      = string
  sensitive = true
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "secrets" {
  name     = "rg-acme-orders-secrets"
  location = "East US"
}

resource "azurerm_key_vault" "main" {
  name                = "kv-acme-orders"
  location            = azurerm_resource_group.secrets.location
  resource_group_name = azurerm_resource_group.secrets.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"
}

resource "azurerm_key_vault_secret" "db_password" {
  name         = "orders-db-password"
  value        = var.db_password
  key_vault_id = azurerm_key_vault.main.id
}
`,
  },
  {
    example: "intermediate",
    description: "The vault is in UK South (paired with UK West, both trusted) and the secret has an expiry, but it is a year out and nothing rotates the secret when it expires.",
    code: `provider "azurerm" {
  features {}
}

variable "db_password" {
  type      = string
  sensitive = true
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "secrets" {
  name     = "rg-acme-orders-secrets"
  location = "uksouth"
}

resource "azurerm_key_vault" "main" {
  name                       = "kv-acme-orders"
  location                   = azurerm_resource_group.secrets.location
  resource_group_name        = azurerm_resource_group.secrets.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  rbac_authorization_enabled = true
  purge_protection_enabled   = true
}

resource "time_rotating" "db_password" {
  rotation_days = 365
}

resource "azurerm_key_vault_secret" "db_password" {
  name            = "orders-db-password"
  value           = var.db_password
  key_vault_id    = azurerm_key_vault.main.id
  content_type    = "password"
  expiration_date = time_rotating.db_password.rotation_rfc3339
}
`,
  },
  {
    example: "hardened",
    description: "The secret expires every 90 days and an Event Grid subscription on SecretNearExpiry calls a rotation function; the vault and its paired region are both trusted.",
    code: `provider "azurerm" {
  features {}
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "rotation_function_id" {
  type        = string
  description = "Resource ID of the function that writes a new secret version"
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "secrets" {
  name     = "rg-acme-orders-secrets"
  location = "uksouth" # CCC.SecMgmt.CN02: trusted region, paired with ukwest
}

resource "azurerm_key_vault" "main" {
  name                       = "kv-acme-orders"
  location                   = azurerm_resource_group.secrets.location
  resource_group_name        = azurerm_resource_group.secrets.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "premium"
  rbac_authorization_enabled = true
  purge_protection_enabled   = true
  soft_delete_retention_days = 90
}

# CCC.SecMgmt.CN01: the secret expires within the 90-day threshold
resource "time_rotating" "db_password" {
  rotation_days = 90
}

resource "azurerm_key_vault_secret" "db_password" {
  name            = "orders-db-password"
  value           = var.db_password
  key_vault_id    = azurerm_key_vault.main.id
  content_type    = "password"
  expiration_date = time_rotating.db_password.rotation_rfc3339
}

# CCC.SecMgmt.CN01: rotate automatically before the secret expires
resource "azurerm_eventgrid_system_topic" "vault" {
  name                = "evgt-kv-acme-orders"
  resource_group_name = azurerm_resource_group.secrets.name
  location            = azurerm_resource_group.secrets.location
  source_resource_id  = azurerm_key_vault.main.id
  topic_type          = "Microsoft.KeyVault.vaults"
}

resource "azurerm_eventgrid_system_topic_event_subscription" "rotate" {
  name                 = "rotate-on-near-expiry"
  system_topic         = azurerm_eventgrid_system_topic.vault.name
  resource_group_name  = azurerm_resource_group.secrets.name
  included_event_types = ["Microsoft.KeyVault.SecretNearExpiry"]

  azure_function_endpoint {
    function_id = var.rotation_function_id
  }
}
`,
  },
];
