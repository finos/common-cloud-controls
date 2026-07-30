data "azurerm_client_config" "current" {}

locals {
  name_main = "finos-ccc-integration-k8s-main"
  name_bad  = "finos-ccc-integration-k8s-bad"

  cluster_tags = merge(var.common_tags, {
    CFIControlSet      = "CCC.K8S"
    Owner              = "finos-ccc"
    Environment        = "nonprod"
    DataClassification = "internal"
  })

  fixture_metadata = {
    test_workload_namespace               = "ccc-test"
    test_workload_service_account         = "ccc-wi-sa"
    test_workload_service_account_unbound = "ccc-wi-sa-unbound"
    network_control_namespace             = "ccc-network-control"
    protected_secret_name                 = "ccc-protected-secret"
    unrelated_secret_name                 = "ccc-unrelated-secret"
    approved_storage_class                = "ccc-approved-sc"
    disallowed_storage_class              = "ccc-blocked-sc"
    approved_access_mode                  = "ReadWriteOnce"
    disallowed_access_mode                = "ReadWriteMany"
    required_metadata_keys                = ["Owner", "Environment", "DataClassification"]
  }
}

resource "azurerm_virtual_network" "k8s" {
  name                = "finos-ccc-integration-k8s-vnet"
  location            = var.location
  resource_group_name = var.resource_group
  address_space       = ["10.82.0.0/16"]
  tags                = local.cluster_tags
}

resource "azurerm_subnet" "main" {
  name                 = "finos-ccc-integration-k8s-main"
  resource_group_name  = var.resource_group
  virtual_network_name = azurerm_virtual_network.k8s.name
  address_prefixes     = ["10.82.0.0/20"]
}

resource "azurerm_subnet" "bad" {
  name                 = "finos-ccc-integration-k8s-bad"
  resource_group_name  = var.resource_group
  virtual_network_name = azurerm_virtual_network.k8s.name
  address_prefixes     = ["10.82.16.0/20"]
}

resource "azurerm_log_analytics_workspace" "k8s" {
  name                = "finos-ccc-integration-k8s-law"
  location            = var.location
  resource_group_name = var.resource_group
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.cluster_tags
}

resource "azurerm_user_assigned_identity" "main" {
  name                = "finos-ccc-integration-k8s-main-cp"
  location            = var.location
  resource_group_name = var.resource_group
  tags                = local.cluster_tags
}

resource "azurerm_role_assignment" "main_network" {
  scope                = azurerm_virtual_network.k8s.id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.main.principal_id
}

resource "azurerm_user_assigned_identity" "wi_bound" {
  name                = "finos-ccc-integration-k8s-wi-bound"
  location            = var.location
  resource_group_name = var.resource_group
  tags                = local.cluster_tags
}

resource "azurerm_storage_account" "wi_probe" {
  name                     = "finosccck8swiprobe"
  resource_group_name      = var.resource_group
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  tags                     = local.cluster_tags
}

resource "azurerm_storage_container" "wi_probe" {
  name                  = "probe"
  storage_account_id    = azurerm_storage_account.wi_probe.id
  container_access_type = "private"
}

resource "azurerm_role_assignment" "wi_bound_blob" {
  scope                = azurerm_storage_account.wi_probe.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_user_assigned_identity.wi_bound.principal_id
}

resource "azurerm_kubernetes_cluster" "main" {
  name                              = local.name_main
  location                          = var.location
  resource_group_name               = var.resource_group
  dns_prefix                        = "finosccck8smain"
  kubernetes_version                = var.kubernetes_version
  sku_tier                          = "Free"
  private_cluster_enabled           = false
  oidc_issuer_enabled               = true
  workload_identity_enabled         = true
  local_account_disabled            = true
  azure_policy_enabled              = true
  role_based_access_control_enabled = true

  api_server_access_profile {
    authorized_ip_ranges = var.api_authorized_cidrs
  }

  azure_active_directory_role_based_access_control {
    azure_rbac_enabled = true
    tenant_id          = data.azurerm_client_config.current.tenant_id
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.main.id]
  }

  default_node_pool {
    name                         = "main"
    vm_size                      = var.node_vm_size
    node_count                   = 1
    vnet_subnet_id               = azurerm_subnet.main.id
    max_pods                     = 50
    os_disk_size_gb              = 64
    temporary_name_for_rotation  = "mainrot"
    only_critical_addons_enabled = false
    upgrade_settings {
      max_surge = "10%"
    }
    tags = local.cluster_tags
  }

  network_profile {
    network_plugin    = "azure"
    network_policy    = "azure"
    load_balancer_sku = "standard"
    service_cidr      = "10.200.0.0/16"
    dns_service_ip    = "10.200.0.10"
  }

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.k8s.id
  }

  tags = merge(local.cluster_tags, {
    Name = local.name_main
  })

  depends_on = [azurerm_role_assignment.main_network]
}

resource "azurerm_federated_identity_credential" "wi_bound" {
  name                = "ccc-wi-sa"
  resource_group_name = var.resource_group
  parent_id           = azurerm_user_assigned_identity.wi_bound.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = azurerm_kubernetes_cluster.main.oidc_issuer_url
  subject             = "system:serviceaccount:${local.fixture_metadata.test_workload_namespace}:${local.fixture_metadata.test_workload_service_account}"
}

resource "azurerm_user_assigned_identity" "bad" {
  name                = "finos-ccc-integration-k8s-bad-cp"
  location            = var.location
  resource_group_name = var.resource_group
  tags                = merge(local.cluster_tags, { CFIRole = "bad" })
}

resource "azurerm_role_assignment" "bad_network_pre" {
  scope                = azurerm_virtual_network.k8s.id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.bad.principal_id
}

resource "azurerm_kubernetes_cluster" "bad" {
  name                    = local.name_bad
  location                = var.location
  resource_group_name     = var.resource_group
  dns_prefix              = "finosccck8sbad"
  kubernetes_version      = var.kubernetes_version
  sku_tier                = "Free"
  private_cluster_enabled = false
  local_account_disabled  = false

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.bad.id]
  }

  default_node_pool {
    name                        = "bad"
    vm_size                     = var.node_vm_size
    node_count                  = 1
    vnet_subnet_id              = azurerm_subnet.bad.id
    max_pods                    = 30
    os_disk_size_gb             = 64
    temporary_name_for_rotation = "badrot"
    upgrade_settings {
      max_surge = "10%"
    }
    tags = merge(local.cluster_tags, { CFIRole = "bad" })
  }

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
    service_cidr      = "10.201.0.0/16"
    dns_service_ip    = "10.201.0.10"
  }

  tags = merge(local.cluster_tags, {
    Name    = local.name_bad
    CFIRole = "bad"
  })

  depends_on = [azurerm_role_assignment.bad_network_pre]
}
