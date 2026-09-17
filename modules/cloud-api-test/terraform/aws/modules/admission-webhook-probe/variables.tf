variable "probe_image" {
  type        = string
  description = "Container image implementing /validate /healthz /readyz for CN11.AR03."
}

variable "fixture_metadata" {
  type = object({
    webhook_probe_namespace      = string
    webhook_probe_test_namespace = string
    webhook_probe_deployment     = string
    webhook_probe_configuration  = string
    webhook_probe_service        = string
    enabled_replicas             = number
  })
}
