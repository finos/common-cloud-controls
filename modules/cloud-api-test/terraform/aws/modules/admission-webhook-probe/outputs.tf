output "webhook_probe_namespace" {
  value = kubernetes_namespace_v1.probe.metadata[0].name
}

output "webhook_probe_test_namespace" {
  value = kubernetes_namespace_v1.test.metadata[0].name
}

output "webhook_probe_deployment" {
  value = kubernetes_deployment_v1.probe.metadata[0].name
}

output "webhook_probe_service" {
  value = kubernetes_service_v1.probe.metadata[0].name
}

output "webhook_probe_configuration" {
  value = kubernetes_validating_webhook_configuration_v1.probe.metadata[0].name
}

output "enabled_replicas" {
  value = var.fixture_metadata.enabled_replicas
}
