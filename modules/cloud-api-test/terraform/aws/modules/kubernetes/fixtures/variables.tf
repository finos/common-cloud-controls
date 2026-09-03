variable "wi_bound_role_arn" {
  type        = string
  description = "IRSA role ARN annotated onto the bound workload ServiceAccount."
}

variable "fixture_metadata" {
  type = object({
    test_workload_namespace               = string
    test_workload_service_account         = string
    test_workload_service_account_unbound = string
    network_control_namespace             = string
    protected_secret_name                 = string
    unrelated_secret_name                 = string
    approved_storage_class                = string
    disallowed_storage_class              = string
    approved_access_mode                  = string
    disallowed_access_mode                = string
    required_metadata_keys                = list(string)
  })
  description = "Namespace/SA/secret/storage-class names shared with privateer config."
}
