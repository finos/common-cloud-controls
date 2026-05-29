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
