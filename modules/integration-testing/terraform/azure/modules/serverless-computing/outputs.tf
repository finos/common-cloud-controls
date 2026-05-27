output "function_name" {
  value = azurerm_linux_function_app.main.name
}

output "private_endpoint_url" {
  value = "https://${azurerm_linux_function_app.main.name}.privatelink.azurewebsites.net/api/HttpTrigger"
}

output "public_invoke_url" {
  value = ""
}

output "rate_limit_threshold" {
  value = 10
}

output "burst_overrun" {
  value = 15
}
