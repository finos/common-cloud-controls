import type { ExampleSource } from "../index";

/** Azure (Virtual Machines) variants of each example: a Linux application server. */
export const EXAMPLES: ExampleSource[] = [
  {
    example: "basic",
    description: "A Linux VM with a public IP, password logins and an NSG that opens SSH to the internet, relying on Azure defaults for everything else.",
    code: `provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "app" {
  name     = "rg-app"
  location = "uksouth"
}

resource "azurerm_virtual_network" "main" {
  name                = "vnet-app"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name
  address_space       = ["10.30.0.0/16"]
}

resource "azurerm_subnet" "app" {
  name                 = "snet-app"
  resource_group_name  = azurerm_resource_group.app.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.30.1.0/24"]
}

resource "azurerm_public_ip" "app" {
  name                = "pip-app"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name
  allocation_method   = "Static"
}

resource "azurerm_network_security_group" "app" {
  name                = "nsg-app"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name

  security_rule {
    name                       = "allow-ssh"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_network_interface" "app" {
  name                = "nic-app"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.app.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.app.id
  }
}

resource "azurerm_network_interface_security_group_association" "app" {
  network_interface_id      = azurerm_network_interface.app.id
  network_security_group_id = azurerm_network_security_group.app.id
}

resource "azurerm_linux_virtual_machine" "app" {
  name                            = "vm-app"
  location                        = azurerm_resource_group.app.location
  resource_group_name             = azurerm_resource_group.app.name
  size                            = "Standard_B2s"
  admin_username                  = "azureuser"
  admin_password                  = var.admin_password
  disable_password_authentication = false
  network_interface_ids           = [azurerm_network_interface.app.id]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }
}

variable "admin_password" {
  type      = string
  sensitive = true
}
`,
  },
  {
    example: "intermediate",
    description:
      "SSH keys only, SSH limited to the office range, encryption at host and an Activity Log export. The VM still has a public IP serving HTTPS to the internet, platform-managed disk keys and a locally redundant backup vault.",
    code: `provider "azurerm" {
  features {}
}

data "azurerm_subscription" "current" {}

resource "azurerm_resource_group" "app" {
  name     = "rg-app"
  location = "uksouth"
}

resource "azurerm_virtual_network" "main" {
  name                = "vnet-app"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name
  address_space       = ["10.30.0.0/16"]
}

resource "azurerm_subnet" "app" {
  name                 = "snet-app"
  resource_group_name  = azurerm_resource_group.app.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.30.1.0/24"]
}

resource "azurerm_public_ip" "app" {
  name                = "pip-app"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name
  allocation_method   = "Static"
}

resource "azurerm_network_security_group" "app" {
  name                = "nsg-app"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name

  security_rule {
    name                       = "ssh-from-office"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "203.0.113.0/24"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "https-from-internet"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }
}

resource "azurerm_network_interface" "app" {
  name                = "nic-app"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.app.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.app.id
  }
}

resource "azurerm_network_interface_security_group_association" "app" {
  network_interface_id      = azurerm_network_interface.app.id
  network_security_group_id = azurerm_network_security_group.app.id
}

resource "azurerm_linux_virtual_machine" "app" {
  name                       = "vm-app"
  location                   = azurerm_resource_group.app.location
  resource_group_name        = azurerm_resource_group.app.name
  size                       = "Standard_D2s_v5"
  admin_username             = "azureuser"
  network_interface_ids      = [azurerm_network_interface.app.id]
  encryption_at_host_enabled = true

  admin_ssh_key {
    username   = "azureuser"
    public_key = file("~/.ssh/id_ed25519.pub")
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }
}

resource "azurerm_log_analytics_workspace" "ops" {
  name                = "log-ops"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name
  retention_in_days   = 365
}

resource "azurerm_monitor_diagnostic_setting" "activity" {
  name                       = "activity-log"
  target_resource_id         = data.azurerm_subscription.current.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.ops.id

  enabled_log {
    category = "Administrative"
  }
}

resource "azurerm_recovery_services_vault" "backup" {
  name                = "rsv-app"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name
  sku                 = "Standard"
  storage_mode_type   = "LocallyRedundant"
}

resource "azurerm_backup_policy_vm" "daily" {
  name                = "daily"
  resource_group_name = azurerm_resource_group.app.name
  recovery_vault_name = azurerm_recovery_services_vault.backup.name

  backup {
    frequency = "Daily"
    time      = "03:00"
  }

  retention_daily {
    count = 14
  }
}

resource "azurerm_backup_protected_vm" "app" {
  resource_group_name = azurerm_resource_group.app.name
  recovery_vault_name = azurerm_recovery_services_vault.backup.name
  source_vm_id        = azurerm_linux_virtual_machine.app.id
  backup_policy_id    = azurerm_backup_policy_vm.daily.id
}
`,
  },
  {
    example: "hardened",
    description: "A private VM reached only through Azure Bastion with Entra ID login, encrypted at host with a rotating customer-managed key, guest logs and the Activity Log sent to Log Analytics, and geo-redundant backups.",
    code: `provider "azurerm" {
  features {}
}

data "azurerm_client_config" "current" {}
data "azurerm_subscription" "current" {}

resource "azurerm_resource_group" "app" {
  name     = "rg-app"
  location = "uksouth"
}

resource "azurerm_key_vault" "disks" {
  name                      = "kv-app-disks"
  location                  = azurerm_resource_group.app.location
  resource_group_name       = azurerm_resource_group.app.name
  tenant_id                 = data.azurerm_client_config.current.tenant_id
  sku_name                  = "premium"
  purge_protection_enabled  = true
  enable_rbac_authorization = true
}

resource "azurerm_key_vault_key" "disks" {
  name         = "disk-key"
  key_vault_id = azurerm_key_vault.disks.id
  key_type     = "RSA-HSM" # CCC.Core.CN11: RSA-3072
  key_size     = 3072
  key_opts     = ["wrapKey", "unwrapKey"]

  rotation_policy {
    expire_after = "P180D"
    automatic {
      time_after_create = "P90D" # CCC.Core.CN11: rotate within 180 days
    }
  }
}

resource "azurerm_disk_encryption_set" "app" {
  name                      = "des-app"
  location                  = azurerm_resource_group.app.location
  resource_group_name       = azurerm_resource_group.app.name
  key_vault_key_id          = azurerm_key_vault_key.disks.versionless_id
  auto_key_rotation_enabled = true # disks follow each new key version

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_role_assignment" "des_key" {
  scope                = azurerm_key_vault.disks.id
  role_definition_name = "Key Vault Crypto Service Encryption User"
  principal_id         = azurerm_disk_encryption_set.app.identity[0].principal_id
}

resource "azurerm_network_security_group" "app" {
  name                = "nsg-app"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name

  # SSH only from the Azure Bastion subnet (CCC.Core.CN05)
  security_rule {
    name                       = "ssh-from-bastion"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "10.30.255.0/26"
    destination_address_prefix = "*"
  }
}

# No public_ip_address_id: not reachable from the internet (CCC.Core.CN05)
resource "azurerm_network_interface" "app" {
  name                = "nic-app"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Dynamic"
  }
}

resource "azurerm_network_interface_security_group_association" "app" {
  network_interface_id      = azurerm_network_interface.app.id
  network_security_group_id = azurerm_network_security_group.app.id
}

resource "azurerm_linux_virtual_machine" "app" {
  name                       = "vm-app"
  location                   = azurerm_resource_group.app.location
  resource_group_name        = azurerm_resource_group.app.name
  zone                       = "1"
  size                       = "Standard_D2s_v5"
  admin_username             = "azureuser"
  network_interface_ids      = [azurerm_network_interface.app.id]
  encryption_at_host_enabled = true # CCC.Core.CN02: temp disk and caches too

  admin_ssh_key {
    username   = "azureuser"
    public_key = file("~/.ssh/id_ed25519.pub")
  }

  os_disk {
    caching                = "ReadWrite"
    storage_account_type   = "Premium_ZRS"
    disk_encryption_set_id = azurerm_disk_encryption_set.app.id # CCC.Core.CN11
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }

  identity {
    type = "SystemAssigned"
  }
}

# Entra ID login for SSH (CCC.Core.CN03)
resource "azurerm_virtual_machine_extension" "entra_login" {
  name                 = "AADSSHLoginForLinux"
  virtual_machine_id   = azurerm_linux_virtual_machine.app.id
  publisher            = "Microsoft.Azure.ActiveDirectory"
  type                 = "AADSSHLoginForLinux"
  type_handler_version = "1.0"
}

resource "azurerm_virtual_machine_extension" "monitor_agent" {
  name                 = "AzureMonitorLinuxAgent"
  virtual_machine_id   = azurerm_linux_virtual_machine.app.id
  publisher            = "Microsoft.Azure.Monitor"
  type                 = "AzureMonitorLinuxAgent"
  type_handler_version = "1.0"
}

resource "azurerm_log_analytics_workspace" "ops" {
  name                = "log-ops"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name
  retention_in_days   = 365
}

# Activity Log kept beyond 90 days (CCC.Core.CN04)
resource "azurerm_monitor_diagnostic_setting" "activity" {
  name                       = "activity-log"
  target_resource_id         = data.azurerm_subscription.current.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.ops.id

  enabled_log {
    category = "Administrative"
  }
}

# Guest auth logs leave the VM (CCC.Core.CN09)
resource "azurerm_monitor_data_collection_rule" "syslog" {
  name                = "dcr-syslog"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name

  destinations {
    log_analytics {
      name                  = "ops"
      workspace_resource_id = azurerm_log_analytics_workspace.ops.id
    }
  }

  data_flow {
    streams      = ["Microsoft-Syslog"]
    destinations = ["ops"]
  }

  data_sources {
    syslog {
      name           = "auth"
      facility_names = ["auth", "authpriv"]
      log_levels     = ["*"]
      streams        = ["Microsoft-Syslog"]
    }
  }
}

resource "azurerm_monitor_data_collection_rule_association" "app" {
  name                    = "dcra-app"
  target_resource_id      = azurerm_linux_virtual_machine.app.id
  data_collection_rule_id = azurerm_monitor_data_collection_rule.syslog.id
}

# Geo-redundant backups in the paired region (CCC.Core.CN08)
resource "azurerm_recovery_services_vault" "backup" {
  name                         = "rsv-app"
  location                     = azurerm_resource_group.app.location
  resource_group_name          = azurerm_resource_group.app.name
  sku                          = "Standard"
  storage_mode_type            = "GeoRedundant"
  cross_region_restore_enabled = true
}

resource "azurerm_backup_policy_vm" "daily" {
  name                = "daily"
  resource_group_name = azurerm_resource_group.app.name
  recovery_vault_name = azurerm_recovery_services_vault.backup.name

  backup {
    frequency = "Daily"
    time      = "03:00"
  }

  retention_daily {
    count = 30
  }
}

resource "azurerm_backup_protected_vm" "app" {
  resource_group_name = azurerm_resource_group.app.name
  recovery_vault_name = azurerm_recovery_services_vault.backup.name
  source_vm_id        = azurerm_linux_virtual_machine.app.id
  backup_policy_id    = azurerm_backup_policy_vm.daily.id
}

variable "subnet_id" {
  description = "Workload subnet in the hub-and-spoke network, next to AzureBastionSubnet."
  type        = string
}
`,
  },
];
