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
  source               = "./modules/kubernetes"
  project_id           = var.project_id
  region               = var.region
  api_authorized_cidrs = var.k8s_api_authorized_cidrs
  common_labels        = local.common_labels
}

data "google_client_config" "default" {}

provider "kubernetes" {
  alias                  = "gke_main"
  host                   = "https://${module.kubernetes.main_endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(module.kubernetes.main_ca_certificate)
}

provider "kubectl" {
  alias                  = "gke_main"
  host                   = "https://${module.kubernetes.main_endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(module.kubernetes.main_ca_certificate)
  load_config_file       = false
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
