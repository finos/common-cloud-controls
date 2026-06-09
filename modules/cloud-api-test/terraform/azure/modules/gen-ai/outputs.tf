output "endpoint_name" {
  value = local.endpoint_name
}

output "guardrail_name" {
  value = local.guardrail_name
}

output "pinned_model_version" {
  description = "Azure OpenAI deployment name used as pinned-model-version in privateer config."
  value       = local.endpoint_name
}

output "openai_endpoint" {
  value = azurerm_cognitive_account.openai.endpoint
}

output "openai_account_name" {
  value = azurerm_cognitive_account.openai.name
}

output "openai_deployment_model" {
  value = local.deployment_model
}

output "kb_id" {
  value = local.kb_name
}

output "approved_source_id" {
  value = local.approved_source_id
}

output "unvetted_source_id" {
  value = local.unvetted_source_id
}

output "acceptable_sources" {
  value = local.acceptable_sources
}

output "blocked_input_terms" {
  value = [var.blocked_input_term]
}

output "blocked_output_terms" {
  value = [var.blocked_output_term]
}

output "plugin_tool_name" {
  value = local.plugin_tool_name
}
