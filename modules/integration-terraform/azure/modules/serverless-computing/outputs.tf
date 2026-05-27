output "good_function_name" {
  value = azurerm_linux_function_app.good.name
}

output "bad_function_name" {
  value = azurerm_linux_function_app.bad.name
}

output "good_private_url" {
  value = "https://${azurerm_linux_function_app.good.name}.privatelink.azurewebsites.net/api/HttpTrigger"
}

output "bad_public_url" {
  value = "https://${azurerm_linux_function_app.bad.default_hostname}/api/HttpTrigger"
}

output "rate_limit_threshold" {
  value = 10
}

output "burst_overrun" {
  value = 15
}
