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
  EOT
  default     = ["10.0.0.0/8"]
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
