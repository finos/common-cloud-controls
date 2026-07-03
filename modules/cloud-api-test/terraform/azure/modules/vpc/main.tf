# Three VNets: good (receiver + VM subnet), bad, one allow-list peer.
# Extra allow-list / disallowed / non-allowlisted ids in outputs reuse the same VNets.

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

resource "azurerm_virtual_network" "bad" {
  name                = "finos-ccc-integration-vpc-bad"
  address_space       = ["10.101.0.0/16"]
  location            = var.location
  resource_group_name = var.resource_group
  tags = merge(var.common_tags, {
    CFIControlSet = "CCC.VPC"
    CFIVpcRole    = "bad"
  })
}

resource "azurerm_subnet" "bad_public" {
  name                 = "finos-ccc-integration-vpc-bad-public"
  resource_group_name  = var.resource_group
  virtual_network_name = azurerm_virtual_network.bad.name
  address_prefixes     = ["10.101.1.0/24"]
}

resource "azurerm_virtual_network" "cn03_allowed_01" {
  name                = "finos-ccc-integration-vpc-cn03-allow-01"
  address_space       = ["10.102.0.0/20"]
  location            = var.location
  resource_group_name = var.resource_group
  tags = merge(var.common_tags, {
    PeerClass = "allowed"
  })
}
