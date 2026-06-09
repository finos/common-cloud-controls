locals {
  endpoint_name      = "finos-ccc-integration-genai-endpoint"
  guardrail_name     = "finos-ccc-integration-genai-guardrail"
  kb_name            = "finos-ccc-integration-genai-kb"
  approved_source_id = "finos-ccc-integration-genai-approved-bucket"
  unvetted_source_id = "finos-ccc-integration-genai-unvetted-bucket"
  plugin_tool_name   = "finos-ccc-integration-genai-plugin"
  acceptable_sources = ["gs://${local.approved_source_id}/"]
  vertex_model_id    = var.pinned_model_version
}

resource "google_project_service" "vertex_ai" {
  project            = var.project_id
  service            = "aiplatform.googleapis.com"
  disable_on_destroy = false
}
