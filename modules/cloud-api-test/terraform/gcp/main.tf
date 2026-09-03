provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# Fall back to the applying machine's public IP so the runner can still reach
# a control plane locked to master authorized networks.
data "http" "runner_public_ip" {
  count = length(var.k8s_api_authorized_cidrs) == 0 ? 1 : 0
  url   = "https://checkip.amazonaws.com/"
}

locals {
  common_labels = {
    managed_by = "terraform"
    project    = "ccc-cfi-compliance"
  }

  secret_accessor_members = compact([
    var.integration_runner_service_account_email != "" ? "serviceAccount:${var.integration_runner_service_account_email}" : "",
  ])

  k8s_api_authorized_cidrs = length(var.k8s_api_authorized_cidrs) > 0 ? var.k8s_api_authorized_cidrs : [
    "${chomp(data.http.runner_public_ip[0].response_body)}/32"
  ]
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
  api_authorized_cidrs = local.k8s_api_authorized_cidrs
  node_locations       = [var.zone]
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

  # Cluster outputs are unknown until apply, so defer client construction rather
  # than failing provider configuration at plan time.
  lazy_load = true
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
