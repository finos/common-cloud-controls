resource "aws_bedrock_guardrail" "main" {
  name                      = "finos-ccc-integration-genai-guardrail"
  blocked_input_messaging   = "Input blocked by CCC integration guardrail"
  blocked_outputs_messaging = "Output blocked by CCC integration guardrail"
  description               = "CCC GenAI integration guardrail with deterministic probe word lists"

  word_policy_config {
    words_config {
      text           = var.blocked_input_term
      input_enabled  = true
      output_enabled = false
      input_action   = "BLOCK"
    }
    words_config {
      text           = var.blocked_output_term
      input_enabled  = false
      output_enabled = true
      output_action  = "BLOCK"
    }
  }

  tags = merge(var.common_tags, {
    CFIControlSet = "CCC.GenAI"
  })
}

locals {
  endpoint_name            = "finos-ccc-integration-genai-endpoint"
  kb_name                  = "finos-ccc-integration-genai-kb"
  approved_source_id       = "finos-ccc-integration-genai-approved-bucket"
  unvetted_source_id       = "finos-ccc-integration-genai-unvetted-bucket"
  plugin_tool_name         = "finos-ccc-integration-genai-plugin"
  acceptable_sources       = ["s3://${local.approved_source_id}/"]
}
