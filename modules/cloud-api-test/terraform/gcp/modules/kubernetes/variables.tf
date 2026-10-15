variable "project_id" {
  type        = string
  description = "GCP project hosting GKE fixtures. Prerequisite: container.googleapis.com, compute, iam, binaryauthorization APIs enabled."
}

variable "region" {
  type = string
}

variable "common_labels" {
  type = map(string)
}

variable "kubernetes_version_prefix" {
  type        = string
  description = "GKE release channel / version prefix. Empty uses REGULAR channel default."
  default     = ""
}

variable "node_machine_type" {
  type        = string
  description = <<-EOT
    Node type for the single-node MAIN pool. Prefer a dedicated-core SKU:
    e2-medium is shared-core and only exposes ~940m allocatable CPU after GKE
    reservations, which is less than kube-system + Calico + fixture requests
    and leaves SetBackendAvailability(true) Pending after scale-to-zero.
  EOT
  default     = "e2-standard-2"
}

variable "node_locations" {
  type        = list(string)
  description = "Zones for regional cluster node pools. Must be valid zones in var.region (us-east1 has b/c/d, not a)."
  default     = null
}
