output "test_workload_namespace" {
  value = kubernetes_namespace_v1.test.metadata[0].name
}

output "network_control_namespace" {
  value = kubernetes_namespace_v1.network_control.metadata[0].name
}

output "approved_storage_class" {
  value = kubernetes_storage_class_v1.approved.metadata[0].name
}

output "disallowed_storage_class" {
  value = kubernetes_storage_class_v1.blocked.metadata[0].name
}
