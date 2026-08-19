output "main_cluster_name" {
  value = azurerm_kubernetes_cluster.main.name
}

output "bad_cluster_name" {
  value = azurerm_kubernetes_cluster.bad.name
}

output "main_cluster_id" {
  value = azurerm_kubernetes_cluster.main.id
}

output "bad_cluster_id" {
  value = azurerm_kubernetes_cluster.bad.id
}

output "main_fqdn" {
  value = azurerm_kubernetes_cluster.main.fqdn
}

output "bad_fqdn" {
  value = azurerm_kubernetes_cluster.bad.fqdn
}

output "main_kube_config_host" {
  value     = azurerm_kubernetes_cluster.main.kube_config[0].host
  sensitive = true
}

output "main_kube_config_ca" {
  value     = azurerm_kubernetes_cluster.main.kube_config[0].cluster_ca_certificate
  sensitive = true
}

output "main_kube_config_client_certificate" {
  value     = azurerm_kubernetes_cluster.main.kube_config[0].client_certificate
  sensitive = true
}

output "main_kube_config_client_key" {
  value     = azurerm_kubernetes_cluster.main.kube_config[0].client_key
  sensitive = true
}

output "location" {
  value = var.location
}

output "log_analytics_workspace_id" {
  description = "Workspace GUID for AKS control-plane/audit log queries (CN14)."
  value       = azurerm_log_analytics_workspace.k8s.workspace_id
}

output "log_analytics_workspace_resource_id" {
  value = azurerm_log_analytics_workspace.k8s.id
}

output "wi_bound_client_id" {
  value = azurerm_user_assigned_identity.wi_bound.client_id
}

output "wi_bound_principal_id" {
  value = azurerm_user_assigned_identity.wi_bound.principal_id
}

output "wi_probe_storage_account" {
  value = azurerm_storage_account.wi_probe.name
}

output "api_authorized_cidrs" {
  value = var.api_authorized_cidrs
}

output "oidc_issuer_url" {
  value = azurerm_kubernetes_cluster.main.oidc_issuer_url
}

output "fixture_metadata" {
  value = local.fixture_metadata
}

output "kubelet_object_id" {
  value = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}
