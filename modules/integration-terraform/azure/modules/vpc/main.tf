resource "azurerm_virtual_network" "good" {
  name                = "finos-ccc-integration-${var.deployment_suffix}-vpc"
  address_space       = ["10.100.0.0/16"]
  location            = var.location
  resource_group_name = var.resource_group
  tags = merge(var.common_tags, {
    CFIControlSet = "CCC.VPC"
  })
}

resource "azurerm_subnet" "good_public" {
  name                 = "finos-ccc-integration-${var.deployment_suffix}-vpc-public"
  resource_group_name  = var.resource_group
  virtual_network_name = azurerm_virtual_network.good.name
  address_prefixes     = ["10.100.1.0/24"]
}

resource "azurerm_virtual_network" "bad" {
  name                = "finos-ccc-integration-${var.deployment_suffix}-vpc-bad"
  address_space       = ["10.101.0.0/16"]
  location            = var.location
  resource_group_name = var.resource_group
  tags = merge(var.common_tags, {
    CFIControlSet = "CCC.VPC"
    CFIVpcRole    = "bad"
  })
}

resource "azurerm_subnet" "bad_public" {
  name                 = "finos-ccc-integration-${var.deployment_suffix}-vpc-bad-public"
  resource_group_name  = var.resource_group
  virtual_network_name = azurerm_virtual_network.bad.name
  address_prefixes     = ["10.101.1.0/24"]
}

resource "azurerm_virtual_network" "cn03_allowed_01" {
  name                = "finos-ccc-integration-${var.deployment_suffix}-vpc-cn03-allow-01"
  address_space       = ["10.102.0.0/20"]
  location            = var.location
  resource_group_name = var.resource_group
  tags = merge(var.common_tags, {
    PeerClass = "allowed"
  })
}

resource "azurerm_virtual_network" "cn03_allowed_02" {
  name                = "finos-ccc-integration-${var.deployment_suffix}-vpc-cn03-allow-02"
  address_space       = ["10.102.16.0/20"]
  location            = var.location
  resource_group_name = var.resource_group
  tags = merge(var.common_tags, {
    PeerClass = "allowed"
  })
}

resource "azurerm_virtual_network" "cn03_disallowed_01" {
  name                = "finos-ccc-integration-${var.deployment_suffix}-vpc-cn03-deny-01"
  address_space       = ["10.103.0.0/20"]
  location            = var.location
  resource_group_name = var.resource_group
  tags = merge(var.common_tags, {
    PeerClass = "disallowed"
  })
}

resource "azurerm_virtual_network" "cn03_disallowed_02" {
  name                = "finos-ccc-integration-${var.deployment_suffix}-vpc-cn03-deny-02"
  address_space       = ["10.103.16.0/20"]
  location            = var.location
  resource_group_name = var.resource_group
  tags = merge(var.common_tags, {
    PeerClass = "disallowed"
  })
}

resource "azurerm_virtual_network" "cn03_non_allowlisted" {
  name                = "finos-ccc-integration-${var.deployment_suffix}-vpc-cn03-nonallow"
  address_space       = ["10.104.0.0/20"]
  location            = var.location
  resource_group_name = var.resource_group
  tags                = var.common_tags
}
