output "endpoint_name" {
  value = local.endpoint_name
}

output "guardrail_name" {
  value = local.guardrail_name
}

output "pinned_model_version" {
  value = var.pinned_model_version
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
