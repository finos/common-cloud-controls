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
    resource_name     = module.logging.resource_name
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

output "kubernetes" {
  value = {
    resource_name                         = module.kubernetes.main_cluster_name
    main_cluster_name                     = module.kubernetes.main_cluster_name
    bad_cluster_name                      = module.kubernetes.bad_cluster_name
    main_endpoint                         = module.kubernetes.main_endpoint
    bad_endpoint                          = module.kubernetes.bad_endpoint
    region                                = module.kubernetes.region
    project_id                            = module.kubernetes.project_id
    gcp_control_plane_log_name            = module.kubernetes.control_plane_log_name
    wi_bound_email                        = module.kubernetes.wi_bound_email
    wi_probe_resource                     = module.kubernetes.wi_probe_bucket
    node_service_account                  = module.kubernetes.node_service_account
    api_authorized_cidrs                  = module.kubernetes.api_authorized_cidrs
    secrets_kms_key_id                    = module.kubernetes.secrets_kms_key_id
    test_workload_namespace               = module.kubernetes.fixture_metadata.test_workload_namespace
    test_workload_service_account         = module.kubernetes.fixture_metadata.test_workload_service_account
    test_workload_service_account_unbound = module.kubernetes.fixture_metadata.test_workload_service_account_unbound
    network_control_namespace             = module.kubernetes.fixture_metadata.network_control_namespace
    protected_secret_name                 = module.kubernetes.fixture_metadata.protected_secret_name
    unrelated_secret_name                 = module.kubernetes.fixture_metadata.unrelated_secret_name
    approved_storage_class                = module.kubernetes.fixture_metadata.approved_storage_class
    disallowed_storage_class              = module.kubernetes.fixture_metadata.disallowed_storage_class
    fixture_metadata                      = module.kubernetes.fixture_metadata
    main_ca_certificate                   = module.kubernetes.main_ca_certificate
  }
  sensitive = true
}
