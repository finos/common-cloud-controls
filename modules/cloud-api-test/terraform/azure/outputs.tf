output "resource_group_name" {
  value = azurerm_resource_group.this.name
}

output "virtual_machines" {
  value = {
    resource_name       = module.virtual_machines.vm_name
    vm_id               = module.virtual_machines.vm_id
    host_name           = module.virtual_machines.public_ip
    test_listener_port  = module.virtual_machines.listener_port
    allowed_source_cidr = module.virtual_machines.allowed_source_cidr
  }
}

output "serverless_computing" {
  value = {
    resource_name        = try(module.serverless_computing[0].function_name, null)
    function_name        = try(module.serverless_computing[0].function_name, null)
    private_endpoint_url = try(module.serverless_computing[0].private_endpoint_url, null)
    public_invoke_url    = try(module.serverless_computing[0].public_invoke_url, null)
    rate_limit_threshold = try(module.serverless_computing[0].rate_limit_threshold, null)
    burst_overrun        = try(module.serverless_computing[0].burst_overrun, null)
  }
}

output "object_storage" {
  value = {
    resource_name        = module.object_storage.container_name
    storage_account_name = module.object_storage.storage_account_name
    container_name       = module.object_storage.container_name
  }
}

output "vpc" {
  value = {
    resource_name                    = module.vpc.resource_name
    receiver_vpc_id                  = module.vpc.receiver_vpc_id
    non_allowlisted_requester_vpc_id = module.vpc.non_allowlisted_requester_vpc_id
    allowed_requester_vpc_ids        = module.vpc.allowed_requester_vpc_ids
    disallowed_requester_vpc_ids     = module.vpc.disallowed_requester_vpc_ids
    bad_vpc_id                       = module.vpc.bad_vpc_id
  }
}

output "logging" {
  value = {
    resource_name                     = module.logging.resource_name
    azure_log_analytics_workspace_id  = module.logging.log_analytics_workspace_id
    azure_log_analytics_workspace_rid = module.logging.log_analytics_workspace_resource_id
    azure_storage_account             = module.logging.storage_account_name
  }
}

output "secrets" {
  value = {
    resource_name        = module.secrets.secret_name
    azure_secret_name    = module.secrets.azure_secret_name
    azure_key_vault_name = module.secrets.azure_key_vault_name
    azure_key_vault_uri  = module.secrets.azure_key_vault_uri
    stale_version_id     = module.secrets.stale_version_id
    authorized_region    = module.secrets.authorized_region
    unauthorized_region  = module.secrets.unauthorized_region
  }
}

output "kubernetes" {
  value = {
    resource_name                         = module.kubernetes.main_cluster_name
    main_cluster_name                     = module.kubernetes.main_cluster_name
    bad_cluster_name                      = module.kubernetes.bad_cluster_name
    main_cluster_id                       = module.kubernetes.main_cluster_id
    bad_cluster_id                        = module.kubernetes.bad_cluster_id
    main_endpoint                         = module.kubernetes.main_fqdn
    bad_endpoint                          = module.kubernetes.bad_fqdn
    region                                = module.kubernetes.location
    azure_log_analytics_workspace_id      = module.kubernetes.log_analytics_workspace_id
    azure_log_analytics_workspace_rid     = module.kubernetes.log_analytics_workspace_resource_id
    wi_bound_client_id                    = module.kubernetes.wi_bound_client_id
    wi_probe_resource                     = module.kubernetes.wi_probe_storage_account
    api_authorized_cidrs                  = module.kubernetes.api_authorized_cidrs
    oidc_issuer_url                       = module.kubernetes.oidc_issuer_url
    kubelet_object_id                     = module.kubernetes.kubelet_object_id
    test_workload_namespace               = module.kubernetes.fixture_metadata.test_workload_namespace
    test_workload_service_account         = module.kubernetes.fixture_metadata.test_workload_service_account
    test_workload_service_account_unbound = module.kubernetes.fixture_metadata.test_workload_service_account_unbound
    network_control_namespace             = module.kubernetes.fixture_metadata.network_control_namespace
    protected_secret_name                 = module.kubernetes.fixture_metadata.protected_secret_name
    unrelated_secret_name                 = module.kubernetes.fixture_metadata.unrelated_secret_name
    approved_storage_class                = module.kubernetes.fixture_metadata.approved_storage_class
    disallowed_storage_class              = module.kubernetes.fixture_metadata.disallowed_storage_class
    fixture_metadata                      = module.kubernetes.fixture_metadata
  }
  sensitive = true
}
