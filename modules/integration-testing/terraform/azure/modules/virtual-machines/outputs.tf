output "vm_id" {
  value = azurerm_linux_virtual_machine.main.id
}

output "nsg_id" {
  value = azurerm_network_security_group.this.id
}

output "vm_name" {
  value = azurerm_linux_virtual_machine.main.name
}

output "public_ip" {
  value = azurerm_public_ip.this.ip_address
}

output "listener_port" {
  value = 22
}

output "allowed_source_cidr" {
  value = "10.0.0.0/8"
}
