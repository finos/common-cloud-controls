provider "aws" {
  region = var.region
}

data "aws_caller_identity" "current" {}

data "aws_iam_role" "ci_runner" {
  name = var.ci_runner_role_name
}

data "aws_iam_user" "fixture" {
  for_each = toset(var.fixture_iam_user_names)
  user_name = each.value
}

locals {
  common_tags = {
    ManagedBy = "Terraform"
    Project   = "CCC-CFI-Compliance"
  }

  # Ambient CI role + fixture identities that call the kube API (not the cluster creator).
  eks_admin_principal_arns = distinct(compact(concat(
    [data.aws_iam_role.ci_runner.arn],
    [for u in data.aws_iam_user.fixture : u.arn],
    var.eks_admin_principal_arns,
  )))
}

module "vpc" {
  source           = "./modules/vpc"
  vm_instance_type = var.vm_instance_type
  common_tags      = local.common_tags
}

module "virtual_machines" {
  source        = "./modules/virtual-machines"
  instance_type = var.vm_instance_type
  subnet_id     = module.vpc.vm_subnet_id
  vpc_id        = module.vpc.receiver_vpc_id
  common_tags   = local.common_tags
}

module "serverless_computing" {
  source      = "./modules/serverless-computing"
  common_tags = local.common_tags
}

module "object_storage" {
  source      = "./modules/object-storage"
  common_tags = local.common_tags
}

module "logging" {
  source              = "./modules/logging"
  bucket_arn          = module.object_storage.bucket_arn
  lambda_function_arn = module.serverless_computing.function_arn
  common_tags         = local.common_tags
}

module "secrets" {
  source      = "./modules/secrets"
  common_tags = local.common_tags
}

module "kubernetes" {
  source                   = "./modules/kubernetes"
  region                   = var.region
  kubernetes_version       = var.k8s_version
  common_tags              = local.common_tags
  eks_admin_principal_arns = local.eks_admin_principal_arns
}

data "aws_eks_cluster_auth" "main" {
  name = module.kubernetes.main_cluster_name
}

provider "kubernetes" {
  alias = "eks_main"

  # Until the EKS module has been applied, host/CA are unknown and block
  # terraform import of unrelated resources. Use placeholders that lazy_load
  # ignores until the real cluster outputs exist.
  host                   = length(try(module.kubernetes.main_endpoint, "")) > 0 ? module.kubernetes.main_endpoint : "https://127.0.0.1"
  cluster_ca_certificate = length(try(module.kubernetes.main_certificate_authority_data, "")) > 0 ? base64decode(module.kubernetes.main_certificate_authority_data) : ""
  token                  = try(data.aws_eks_cluster_auth.main.token, "")
}

provider "kubectl" {
  alias            = "eks_main"
  load_config_file = false
  lazy_load        = true

  host                   = length(try(module.kubernetes.main_endpoint, "")) > 0 ? module.kubernetes.main_endpoint : "https://127.0.0.1"
  cluster_ca_certificate = length(try(module.kubernetes.main_certificate_authority_data, "")) > 0 ? base64decode(module.kubernetes.main_certificate_authority_data) : ""
  token                  = try(data.aws_eks_cluster_auth.main.token, "")
}

module "kubernetes_fixtures" {
  source            = "./modules/kubernetes/fixtures"
  wi_bound_role_arn = module.kubernetes.wi_bound_role_arn
  fixture_metadata  = module.kubernetes.fixture_metadata

  providers = {
    kubernetes = kubernetes.eks_main
    kubectl    = kubectl.eks_main
  }

  depends_on = [module.kubernetes]
}

# Public untrusted vantage (CN01 reachability) + in-cluster CN11.AR03 webhook probe.
module "reachability_probe" {
  source      = "./modules/reachability-probe"
  common_tags = local.common_tags
}

locals {
  webhook_fixture_metadata = {
    webhook_probe_namespace      = "ccc-admission-webhook-probe"
    webhook_probe_test_namespace = "ccc-admission-webhook-test"
    webhook_probe_deployment     = "ccc-admission-webhook-probe"
    webhook_probe_configuration  = "ccc-admission-webhook-probe"
    webhook_probe_service        = "ccc-admission-webhook-probe"
    enabled_replicas             = 1
  }
}

module "admission_webhook_probe" {
  source           = "./modules/admission-webhook-probe"
  probe_image      = var.webhook_probe_image
  fixture_metadata = local.webhook_fixture_metadata

  providers = {
    kubernetes = kubernetes.eks_main
  }

  depends_on = [module.kubernetes]
}
