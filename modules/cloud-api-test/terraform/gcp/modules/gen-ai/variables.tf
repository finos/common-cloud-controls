variable "common_tags" {
  type        = map(string)
  description = "Tags applied to gen-ai integration metadata."
}

variable "blocked_input_term" {
  type    = string
  default = "CCC_PROBE_INPUT_BLOCK"
}

variable "blocked_output_term" {
  type    = string
  default = "CCC_PROBE_OUTPUT_BLOCK"
}

variable "pinned_model_version" {
  type    = string
  default = "publishers/google/models/gemini-1.5-flash-002"
}
