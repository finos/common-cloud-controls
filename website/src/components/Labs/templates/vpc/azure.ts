import type { ExampleSource } from "../index";

/** Azure (Virtual Network) variants of each example: a virtual network for a two-tier web application. */
export const EXAMPLES: ExampleSource[] = [
  {
    example: "basic",
    description:
      "A typical first virtual network: an NSG open to SSH and HTTP from anywhere, an app subnet with no NSG at all, and no flow logs or Activity Log export.",
    code: `provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "net" {
  name     = "rg-acme-network"
  location = "uksouth"
}

resource "azurerm_virtual_network" "main" {
  name                = "vnet-acme-app"
  location            = azurerm_resource_group.net.location
  resource_group_name = azurerm_resource_group.net.name
  address_space       = ["10.10.0.0/16"]
}

resource "azurerm_subnet" "web" {
  name                 = "snet-web"
  resource_group_name  = azurerm_resource_group.net.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.10.1.0/24"]
}

resource "azurerm_subnet" "app" {
  name                 = "snet-app"
  resource_group_name  = azurerm_resource_group.net.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.10.2.0/24"]
}

resource "azurerm_network_security_group" "web" {
  name                = "nsg-acme-web"
  location            = azurerm_resource_group.net.location
  resource_group_name = azurerm_resource_group.net.name

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

  security_rule {
    name                       = "allow-http"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "web" {
  subnet_id                 = azurerm_subnet.web.id
  network_security_group_id = azurerm_network_security_group.web.id
}
`,
  },
  {
    example: "intermediate",
    description:
      "The same network with NSGs on every subnet, HTTPS only, SSH from the corporate range and the Activity Log exported. But it still uses a legacy NSG flow log, and peers with a partner's network with no Azure Policy allow-list.",
    code: `provider "azurerm" {
  features {}
}

data "azurerm_subscription" "current" {}

resource "azurerm_resource_group" "net" {
  name     = "rg-acme-network"
  location = "uksouth"
}

resource "azurerm_virtual_network" "main" {
  name                = "vnet-acme-app"
  location            = azurerm_resource_group.net.location
  resource_group_name = azurerm_resource_group.net.name
  address_space       = ["10.10.0.0/16"]
}

resource "azurerm_subnet" "web" {
  name                            = "snet-web"
  resource_group_name             = azurerm_resource_group.net.name
  virtual_network_name            = azurerm_virtual_network.main.name
  address_prefixes                = ["10.10.1.0/24"]
  default_outbound_access_enabled = false
}

resource "azurerm_network_security_group" "web" {
  name                = "nsg-acme-web"
  location            = azurerm_resource_group.net.location
  resource_group_name = azurerm_resource_group.net.name

  security_rule {
    name                       = "allow-https"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow-ssh-corporate"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "10.200.0.0/16"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "web" {
  subnet_id                 = azurerm_subnet.web.id
  network_security_group_id = azurerm_network_security_group.web.id
}

resource "azurerm_network_watcher" "main" {
  name                = "nw-acme-uksouth"
  location            = azurerm_resource_group.net.location
  resource_group_name = azurerm_resource_group.net.name
}

resource "azurerm_network_watcher_flow_log" "web" {
  name                      = "fl-nsg-acme-web"
  network_watcher_name      = azurerm_network_watcher.main.name
  resource_group_name       = azurerm_resource_group.net.name
  network_security_group_id = azurerm_network_security_group.web.id
  storage_account_id        = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-acme-logs/providers/Microsoft.Storage/storageAccounts/stacmeflowlogs"
  enabled                   = true

  retention_policy {
    enabled = true
    days    = 90
  }
}

resource "azurerm_monitor_diagnostic_setting" "activity_log" {
  name                       = "activity-log-export"
  target_resource_id         = data.azurerm_subscription.current.id
  log_analytics_workspace_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-acme-logs/providers/Microsoft.OperationalInsights/workspaces/law-acme-security"

  enabled_log {
    category = "Administrative"
  }
}

resource "azurerm_virtual_network_peering" "partner" {
  name                      = "peer-to-partner"
  resource_group_name       = azurerm_resource_group.net.name
  virtual_network_name      = azurerm_virtual_network.main.name
  remote_virtual_network_id = "/subscriptions/11111111-1111-1111-1111-111111111111/resourceGroups/rg-partner/providers/Microsoft.Network/virtualNetworks/vnet-partner"
}
`,
  },
  {
    example: "hardened",
    description:
      "A virtual network configured to satisfy every statically-checkable requirement at TLP:AMBER: private subnets behind NSGs that only admit Front Door, a VNet flow log, an Activity Log export and an Azure Policy peering allow-list.",
    code: `provider "azurerm" {
  features {}
}

data "azurerm_subscription" "current" {}

resource "azurerm_resource_group" "net" {
  name     = "rg-acme-network"
  location = "uksouth" # CCC.Core.CN06: trusted region
}

resource "azurerm_virtual_network" "main" {
  name                = "vnet-acme-app"
  location            = azurerm_resource_group.net.location
  resource_group_name = azurerm_resource_group.net.name
  address_space       = ["10.10.0.0/16"]
}

resource "azurerm_subnet" "web" {
  name                            = "snet-web"
  resource_group_name             = azurerm_resource_group.net.name
  virtual_network_name            = azurerm_virtual_network.main.name
  address_prefixes                = ["10.10.1.0/24"]
  default_outbound_access_enabled = false # CCC.VPC.CN02: no implicit public IPs
}

# CCC.Core.CN05 / CN01: HTTPS only, and only from Azure Front Door
resource "azurerm_network_security_group" "web" {
  name                = "nsg-acme-web"
  location            = azurerm_resource_group.net.location
  resource_group_name = azurerm_resource_group.net.name

  security_rule {
    name                       = "allow-https-front-door"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "AzureFrontDoor.Backend"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "web" {
  subnet_id                 = azurerm_subnet.web.id
  network_security_group_id = azurerm_network_security_group.web.id
}

resource "azurerm_network_watcher" "main" {
  name                = "nw-acme-uksouth"
  location            = azurerm_resource_group.net.location
  resource_group_name = azurerm_resource_group.net.name
}

# CCC.VPC.CN04 / CCC.Core.CN07 / CN09: every flow in the VNet, to a separate storage account
resource "azurerm_network_watcher_flow_log" "vnet" {
  name                 = "fl-vnet-acme-app"
  network_watcher_name = azurerm_network_watcher.main.name
  resource_group_name  = azurerm_resource_group.net.name
  target_resource_id   = azurerm_virtual_network.main.id
  storage_account_id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-acme-logs/providers/Microsoft.Storage/storageAccounts/stacmeflowlogs"
  enabled              = true

  retention_policy {
    enabled = true
    days    = 365
  }
}

# CCC.Core.CN04: keep every network configuration change
resource "azurerm_monitor_diagnostic_setting" "activity_log" {
  name                       = "activity-log-export"
  target_resource_id         = data.azurerm_subscription.current.id
  log_analytics_workspace_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-acme-logs/providers/Microsoft.OperationalInsights/workspaces/law-acme-security"

  enabled_log {
    category = "Administrative"
  }
}

# CCC.VPC.CN03: deny peering with any network not on the allow-list
resource "azurerm_policy_definition" "peering_allowlist" {
  name         = "deny-vnet-peering-outside-allowlist"
  policy_type  = "Custom"
  mode         = "All"
  display_name = "Deny VNet peering outside the allow-list"
  policy_rule = jsonencode({
    "if" = {
      allOf = [
        { field = "type", equals = "Microsoft.Network/virtualNetworks/virtualNetworkPeerings" },
        {
          field = "Microsoft.Network/virtualNetworks/virtualNetworkPeerings/remoteVirtualNetwork.id"
          notIn = ["/subscriptions/22222222-2222-2222-2222-222222222222/resourceGroups/rg-hub/providers/Microsoft.Network/virtualNetworks/vnet-hub"]
        }
      ]
    }
    "then" = { effect = "deny" }
  })
}

resource "azurerm_subscription_policy_assignment" "peering_allowlist" {
  name                 = "deny-vnet-peering-outside-allowlist"
  subscription_id      = data.azurerm_subscription.current.id
  policy_definition_id = azurerm_policy_definition.peering_allowlist.id
}
`,
  },
];
