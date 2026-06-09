variable "location" {
  type        = string
  description = "Azure region for the OpenAI cognitive account."
}

variable "resource_group" {
  type        = string
  description = "Resource group for gen-ai fixtures."
}

variable "common_tags" {
  type        = map(string)
  description = "Tags applied to gen-ai integration resources."
}

variable "integration_runner_object_id" {
  type        = string
  default     = ""
  description = "Entra object id granted Cognitive Services OpenAI User on the integration account."
}

variable "blocked_input_term" {
  type    = string
  default = "CCC_PROBE_INPUT_BLOCK"
}

variable "blocked_output_term" {
  type    = string
  default = "CCC_PROBE_OUTPUT_BLOCK"
}

variable "openai_model_version" {
  type        = string
  default     = "2024-07-18"
  description = "Azure OpenAI model version for gpt-4o-mini deployment."
}
