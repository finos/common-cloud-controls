provider "kubernetes" {
  alias = "aks_main"

  # Until the AKS module has been applied, host/CA are unknown and block
  # terraform import of unrelated resources. Use placeholders that lazy_load
  # ignores until the real cluster outputs exist.
  host                   = coalesce(try(nonsensitive(module.kubernetes.main_kube_config_host), null), "https://127.0.0.1")
  cluster_ca_certificate = length(try(module.kubernetes.main_kube_config_ca, "")) > 0 ? base64decode(module.kubernetes.main_kube_config_ca) : ""

  # Prerequisite: Azure CLI logged in + kubelogin on PATH (AKS local accounts disabled for CN16).
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "kubelogin"
    args = [
      "get-token",
      "--login", "azurecli",
      "--server-id", "6dae42f8-4368-4678-94ff-3960e28e3630",
    ]
  }
}

provider "kubectl" {
  alias            = "aks_main"
  load_config_file = false
  lazy_load        = true

  host                   = coalesce(try(nonsensitive(module.kubernetes.main_kube_config_host), null), "https://127.0.0.1")
  cluster_ca_certificate = length(try(module.kubernetes.main_kube_config_ca, "")) > 0 ? base64decode(module.kubernetes.main_kube_config_ca) : ""

  # Prerequisite: Azure CLI logged in + kubelogin on PATH (AKS local accounts disabled for CN16).
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "kubelogin"
    args = [
      "get-token",
      "--login", "azurecli",
      "--server-id", "6dae42f8-4368-4678-94ff-3960e28e3630",
    ]
  }
}

module "kubernetes_fixtures" {
  source             = "./modules/kubernetes/fixtures"
  wi_bound_client_id = module.kubernetes.wi_bound_client_id
  fixture_metadata   = module.kubernetes.fixture_metadata

  providers = {
    kubernetes = kubernetes.aks_main
    kubectl    = kubectl.aks_main
  }

  depends_on = [module.kubernetes]
}
