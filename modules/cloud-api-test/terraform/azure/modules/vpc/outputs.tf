output "resource_name" {
  value = azurerm_virtual_network.good.name
}

output "receiver_vpc_id" {
  value = azurerm_virtual_network.good.id
}

output "vm_subnet_id" {
  value = azurerm_subnet.vm.id
}
