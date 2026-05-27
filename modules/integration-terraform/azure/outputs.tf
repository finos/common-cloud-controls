output "deployment_suffix" {
  value = var.deployment_suffix
}

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
    resource_name        = module.serverless_computing.function_name
    function_name        = module.serverless_computing.function_name
    private_endpoint_url = module.serverless_computing.private_endpoint_url
    public_invoke_url    = module.serverless_computing.public_invoke_url
    rate_limit_threshold = module.serverless_computing.rate_limit_threshold
    burst_overrun        = module.serverless_computing.burst_overrun
  }
}
