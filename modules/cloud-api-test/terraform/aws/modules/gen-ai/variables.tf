variable "common_tags" {
  type        = map(string)
  description = "Tags applied to gen-ai integration resources."
}

variable "blocked_input_term" {
  type        = string
  description = "Probe token blocked on guardrail input path."
  default     = "CCC_PROBE_INPUT_BLOCK"
}

variable "blocked_output_term" {
  type        = string
  description = "Probe token blocked on guardrail output path."
  default     = "CCC_PROBE_OUTPUT_BLOCK"
}

variable "pinned_model_version" {
  type        = string
  description = "Pinned foundation model version id for CN07 describe checks."
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}
