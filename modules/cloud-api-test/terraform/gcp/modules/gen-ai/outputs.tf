output "endpoint_name" {
  description = "Logical integration endpoint id (maps to publisher model invoke, not a dedicated Vertex endpoint resource)."
  value       = local.endpoint_name
}

output "guardrail_name" {
  value = local.guardrail_name
}

output "pinned_model_version" {
  value = local.vertex_model_id
}

output "vertex_model_id" {
  value = local.vertex_model_id
}

output "vertex_api_base" {
  value = "https://${var.region}-aiplatform.googleapis.com"
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
