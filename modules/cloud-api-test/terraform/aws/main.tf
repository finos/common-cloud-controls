provider "aws" {
  region = var.region
}

# EKS rejects RFC1918 ranges in publicAccessCidrs, so fall back to the applying
# machine's public IP rather than a placeholder that cannot be applied.
data "http" "runner_public_ip" {
  count = length(var.k8s_api_authorized_cidrs) == 0 ? 1 : 0
  url   = "https://checkip.amazonaws.com/"
}

locals {
  common_tags = {
    ManagedBy = "Terraform"
    Project   = "CCC-CFI-Compliance"
  }

  k8s_api_authorized_cidrs = length(var.k8s_api_authorized_cidrs) > 0 ? var.k8s_api_authorized_cidrs : [
    "${chomp(data.http.runner_public_ip[0].response_body)}/32"
  ]
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
  source               = "./modules/kubernetes"
  region               = var.region
  api_authorized_cidrs = local.k8s_api_authorized_cidrs
  kubernetes_version   = var.k8s_version
  common_tags          = local.common_tags
}

data "aws_eks_cluster_auth" "main" {
  name = module.kubernetes.main_cluster_name
}

provider "kubernetes" {
  alias                  = "eks_main"
  host                   = module.kubernetes.main_endpoint
  cluster_ca_certificate = base64decode(module.kubernetes.main_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.main.token
}

provider "kubectl" {
  alias                  = "eks_main"
  host                   = module.kubernetes.main_endpoint
  cluster_ca_certificate = base64decode(module.kubernetes.main_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.main.token
  load_config_file       = false

  # Cluster outputs are unknown until apply, so defer client construction rather
  # than failing provider configuration at plan time.
  lazy_load = true
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
