resource "azurerm_network_security_group" "this" {
  name                = "finos-ccc-integration-vm-nsg"
  location            = var.location
  resource_group_name = var.resource_group

  security_rule {
    name                       = "allow-ssh-from-10-8"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "10.0.0.0/8"
    destination_address_prefix = "*"
  }
}

resource "azurerm_public_ip" "this" {
  name                = "finos-ccc-integration-vm-pip"
  location            = var.location
  resource_group_name = var.resource_group
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "random_password" "vm_admin" {
  length  = 20
  special = true
}

resource "azurerm_network_interface" "this" {
  name                = "finos-ccc-integration-vm-nic"
  location            = var.location
  resource_group_name = var.resource_group

  ip_configuration {
    name                          = "ipconfig1"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.this.id
  }
}

resource "azurerm_network_interface_security_group_association" "this" {
  network_interface_id      = azurerm_network_interface.this.id
  network_security_group_id = azurerm_network_security_group.this.id
}

resource "azurerm_linux_virtual_machine" "main" {
  name                            = "finos-ccc-integration-vm-main"
  resource_group_name             = var.resource_group
  location                        = var.location
  size                            = var.vm_size
  admin_username                  = "cfiadmin"
  admin_password                  = random_password.vm_admin.result
  disable_password_authentication = false
  network_interface_ids           = [azurerm_network_interface.this.id]
  encryption_at_host_enabled      = var.encryption_at_host_enabled

  os_disk {
    name                 = "finos-ccc-integration-vm-osdisk"
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  tags = merge(var.common_tags, {
    Name          = "finos-ccc-integration-vm-main"
    CFIControlSet = "CCC.VM"
  })
}
