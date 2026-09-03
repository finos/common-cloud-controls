provider "aws" {
  region = var.region
}

locals {
  common_tags = merge(var.common_tags, {
    CFIControlSet = "CCC.K8S"
  })

  webhook_fixture_metadata = {
    webhook_probe_namespace      = "ccc-admission-webhook-probe"
    webhook_probe_test_namespace = "ccc-admission-webhook-test"
    webhook_probe_deployment     = "ccc-admission-webhook-probe"
    webhook_probe_configuration  = "ccc-admission-webhook-probe"
    webhook_probe_service        = "ccc-admission-webhook-probe"
    enabled_replicas             = 1
  }
}

data "terraform_remote_state" "aws" {
  backend = var.aws_root_backend
  config  = var.aws_root_backend_config
}

locals {
  k8s = data.terraform_remote_state.aws.outputs.kubernetes
}

data "aws_eks_cluster_auth" "main" {
  name = local.k8s.main_cluster_name
}

provider "kubernetes" {
  host                   = local.k8s.main_endpoint
  cluster_ca_certificate = base64decode(local.k8s.main_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.main.token
}

module "reachability_probe" {
  source      = "./modules/reachability-probe"
  common_tags = local.common_tags
}

module "admission_webhook_probe" {
  source           = "./modules/admission-webhook-probe"
  probe_image      = var.webhook_probe_image
  fixture_metadata = local.webhook_fixture_metadata
}
