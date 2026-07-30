output "reachability_probe" {
  description = "Public vantage probe coordinates. Put probe_url + shared secret into CI env secrets; do not commit the secret."
  value = {
    url               = module.reachability_probe.probe_url
    observer          = module.reachability_probe.observer_name
    shared_secret_arn = module.reachability_probe.shared_secret_arn
    lambda_name       = module.reachability_probe.lambda_function_name
  }
}

output "admission_webhook_probe" {
  description = "In-cluster CN11.AR03 fixture applied into finos-ccc-integration-k8s-main via remote state."
  value = {
    namespace         = module.admission_webhook_probe.webhook_probe_namespace
    test_namespace    = module.admission_webhook_probe.webhook_probe_test_namespace
    deployment        = module.admission_webhook_probe.webhook_probe_deployment
    service           = module.admission_webhook_probe.webhook_probe_service
    configuration     = module.admission_webhook_probe.webhook_probe_configuration
    enabled_replicas  = module.admission_webhook_probe.enabled_replicas
    main_cluster_name = try(local.k8s.main_cluster_name, null)
  }
}
