terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source = "hashicorp/azurerm"
      # Stay on 4.x: existing object-storage uses storage_account_id; 5.x breaks logging/secrets schemas.
      version = ">= 4.0, < 5.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = ">= 2.47"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.6"
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
