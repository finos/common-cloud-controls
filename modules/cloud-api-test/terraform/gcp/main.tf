provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

locals {
  common_labels = {
    managed_by = "terraform"
    project    = "ccc-cfi-compliance"
  }

  secret_accessor_members = compact([
    var.integration_runner_service_account_email != "" ? "serviceAccount:${var.integration_runner_service_account_email}" : "",
  ])

  webhook_fixture_metadata = {
    webhook_probe_namespace      = "ccc-admission-webhook-probe"
    webhook_probe_test_namespace = "ccc-admission-webhook-test"
    webhook_probe_deployment     = "ccc-admission-webhook-probe"
    webhook_probe_configuration  = "ccc-admission-webhook-probe"
    webhook_probe_service        = "ccc-admission-webhook-probe"
    enabled_replicas             = 1
  }
}

module "vpc" {
  source        = "./modules/vpc"
  project_id    = var.project_id
  region        = var.region
  common_labels = local.common_labels
}

module "virtual_machines" {
  source        = "./modules/virtual-machines"
  project_id    = var.project_id
  region        = var.region
  zone          = var.zone
  common_labels = local.common_labels
}

module "serverless_computing" {
  source        = "./modules/serverless-computing"
  project_id    = var.project_id
  region        = var.region
  common_labels = local.common_labels
}

module "object_storage" {
  source        = "./modules/object-storage"
  project_id    = var.project_id
  region        = var.region
  common_labels = local.common_labels
}

module "logging" {
  source     = "./modules/logging"
  project_id = var.project_id
}

module "secrets" {
  source                  = "./modules/secrets"
  project_id              = var.project_id
  region                  = var.region
  common_tags             = local.common_labels
  unauthorized_region     = "europe-west1"
  secret_accessor_members = local.secret_accessor_members
}

module "kubernetes" {
  source         = "./modules/kubernetes"
  project_id     = var.project_id
  region         = var.region
  node_locations = [var.zone]
  common_labels  = local.common_labels
}

data "google_client_config" "default" {}

provider "kubernetes" {
  alias = "gke_main"

  # Until the GKE module has been applied, host/CA are unknown and block
  # terraform import of unrelated resources. Use placeholders that lazy_load
  # ignores until the real cluster outputs exist.
  host                   = length(try(module.kubernetes.main_endpoint, "")) > 0 ? "https://${module.kubernetes.main_endpoint}" : "https://127.0.0.1"
  cluster_ca_certificate = length(try(module.kubernetes.main_ca_certificate, "")) > 0 ? base64decode(module.kubernetes.main_ca_certificate) : ""
  token                  = try(data.google_client_config.default.access_token, "")
}

provider "kubectl" {
  alias            = "gke_main"
  load_config_file = false
  lazy_load        = true

  host                   = length(try(module.kubernetes.main_endpoint, "")) > 0 ? "https://${module.kubernetes.main_endpoint}" : "https://127.0.0.1"
  cluster_ca_certificate = length(try(module.kubernetes.main_ca_certificate, "")) > 0 ? base64decode(module.kubernetes.main_ca_certificate) : ""
  token                  = try(data.google_client_config.default.access_token, "")
}

module "kubernetes_fixtures" {
  source           = "./modules/kubernetes/fixtures"
  wi_bound_email   = module.kubernetes.wi_bound_email
  fixture_metadata = module.kubernetes.fixture_metadata

  providers = {
    kubernetes = kubernetes.gke_main
    kubectl    = kubectl.gke_main
  }

  depends_on = [module.kubernetes]
}

module "admission_webhook_probe" {
  source           = "./modules/admission-webhook-probe"
  probe_image      = var.webhook_probe_image
  fixture_metadata = local.webhook_fixture_metadata

  providers = {
    kubernetes = kubernetes.gke_main
  }

  depends_on = [module.kubernetes]
}
