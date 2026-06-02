output "resource_name" {
  value = "azure-monitor"
}

output "log_analytics_workspace_id" {
  value = azurerm_log_analytics_workspace.main.workspace_id
}

output "log_analytics_workspace_resource_id" {
  value = azurerm_log_analytics_workspace.main.id
}

output "storage_account_name" {
  value = var.storage_account_name
}
