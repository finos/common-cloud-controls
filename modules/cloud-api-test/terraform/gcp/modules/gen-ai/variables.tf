variable "project_id" {
  type        = string
  description = "GCP project id for Vertex AI integration fixtures."
}

variable "region" {
  type        = string
  description = "GCP region for Vertex generateContent calls."
}

variable "common_tags" {
  type        = map(string)
  description = "Labels applied to gen-ai integration metadata."
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
  type        = string
  default     = "gemini-2.0-flash-001"
  description = "Publisher model id for cheap Vertex generateContent (no custom endpoint)."
}
