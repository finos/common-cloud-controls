output "virtual_machines" {
  value = {
    resource_name       = module.virtual_machines.instance_name
    instance_id         = module.virtual_machines.instance_id
    host_name           = module.virtual_machines.external_ip
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

output "object_storage" {
  value = {
    resource_name = module.object_storage.bucket_name
    bucket_name   = module.object_storage.bucket_name
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
    resource_name    = module.logging.resource_name
    gcp_flow_log_name = module.logging.gcp_flow_log_name
  }
}

output "secrets" {
  value = {
    resource_name       = module.secrets.secret_name
    secret_name         = module.secrets.secret_name
    gcp_secret_id       = module.secrets.secret_id
    stale_version_id    = module.secrets.stale_version_id
    authorized_region   = module.secrets.authorized_region
    unauthorized_region = module.secrets.unauthorized_region
  }
}
