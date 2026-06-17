output "resource_name" {
  value = azurerm_virtual_network.good.name
}

output "receiver_vpc_id" {
  value = azurerm_virtual_network.good.id
}

output "vm_subnet_id" {
  value = azurerm_subnet.vm.id
}

output "bad_vpc_id" {
  value = azurerm_virtual_network.bad.id
}

output "non_allowlisted_requester_vpc_id" {
  value = azurerm_virtual_network.bad.id
}

output "allowed_requester_vpc_ids" {
  value = [
    azurerm_virtual_network.cn03_allowed_01.id,
    azurerm_virtual_network.cn03_allowed_01.id,
  ]
}

output "disallowed_requester_vpc_ids" {
  value = [
    azurerm_virtual_network.bad.id,
    azurerm_virtual_network.bad.id,
  ]
}
