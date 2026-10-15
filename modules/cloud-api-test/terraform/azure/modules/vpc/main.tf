# Single cheap VNet for cloud-api driver coverage (includes VM subnet).
# Multi-VNet / non-compliant topologies belong in external CFI fixtures.

resource "azurerm_virtual_network" "good" {
  name                = "finos-ccc-integration-vpc"
  address_space       = ["10.100.0.0/16"]
  location            = var.location
  resource_group_name = var.resource_group
  tags = merge(var.common_tags, {
    CFIControlSet = "CCC.VPC"
  })
}

resource "azurerm_subnet" "good_public" {
  name                 = "finos-ccc-integration-vpc-public"
  resource_group_name  = var.resource_group
  virtual_network_name = azurerm_virtual_network.good.name
  address_prefixes     = ["10.100.1.0/24"]
}

resource "azurerm_subnet" "vm" {
  name                 = "finos-ccc-integration-vm-subnet"
  resource_group_name  = var.resource_group
  virtual_network_name = azurerm_virtual_network.good.name
  address_prefixes     = ["10.100.2.0/24"]
}
