variable "common_tags" {
  type = map(string)
}

variable "observer_name" {
  type    = string
  default = "finos-public-probe"
}

variable "target_allowlist" {
  type        = string
  description = "Comma-separated TARGET_ALLOWLIST for the Go reachability probe (hosts/CIDRs/wildcards)."
  # Integration estates: managed kube API hostnames + common public node/SSH targets.
  default     = "*.amazonaws.com,*.azmk8s.io,*.googleapis.com,*.googleusercontent.com,*.cloudapp.azure.com"
}

variable "port_allowlist" {
  type        = string
  description = "Comma-separated PORT_ALLOWLIST for the Go reachability probe."
  default     = "443,22,3389"
}
