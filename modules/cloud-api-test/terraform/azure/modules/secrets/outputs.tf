output "secret_name" {
  value = azurerm_key_vault_secret.main.name
}

output "azure_secret_name" {
  value = azurerm_key_vault_secret.main.name
}

output "azure_key_vault_name" {
  value = azurerm_key_vault.main.name
}

output "azure_key_vault_uri" {
  value = azurerm_key_vault.main.vault_uri
}

# Non-existent version id for CN01 deny probe (Key Vault returns SecretNotFound).
output "stale_version_id" {
  value = "00000000000000000000000000000000"
}

output "authorized_region" {
  value = var.location
}

output "unauthorized_region" {
  value = var.unauthorized_region
}
