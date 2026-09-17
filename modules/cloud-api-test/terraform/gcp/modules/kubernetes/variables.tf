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

variable "api_authorized_cidrs" {
  type        = list(string)
  description = <<-EOT
    Master authorized networks for the MAIN GKE cluster (CN01.AR01).
    Prerequisite: include runner egress CIDRs; exclude reachability-probe public egress.
    Required (no default): the root resolves this to the runner's public IP when
    the caller does not supply an explicit list.
  EOT

  validation {
    condition     = length(var.api_authorized_cidrs) > 0
    error_message = "api_authorized_cidrs must list at least one CIDR for the MAIN GKE control plane."
  }
}

variable "kubernetes_version_prefix" {
  type        = string
  description = "GKE release channel / version prefix. Empty uses REGULAR channel default."
  default     = ""
}

variable "node_machine_type" {
  type        = string
  description = "Economical node type for single-node pools."
  default     = "e2-medium"
}

variable "node_locations" {
  type        = list(string)
  description = "Zones for regional cluster node pools. Must be valid zones in var.region (us-east1 has b/c/d, not a)."
  default     = null
}
