resource "azurerm_storage_account" "main" {
  name                     = "finoscccintegrationmain"
  resource_group_name      = var.resource_group
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  tags = merge(var.common_tags, {
    CFIControlSet = "CCC.ObjStor"
  })
}

resource "azurerm_storage_container" "main" {
  name                  = "finos-ccc-integration-container-main"
  storage_account_id    = azurerm_storage_account.main.id
  container_access_type = "private"
}
