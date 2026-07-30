terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.4"
    }
    tls = {
      source  = "hashicorp/tls"
      version = ">= 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.29, < 3.0"
    }
    # kubectl_manifest applies raw YAML without a plan-time OpenAPI fetch, so
    # native ValidatingAdmissionPolicies can be created in the same apply as the
    # cluster (kubernetes_manifest cannot: it needs a live API at plan time).
    kubectl = {
      source  = "alekc/kubectl"
      version = ">= 2.0"
    }
  }
}
