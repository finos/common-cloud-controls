terraform {
  required_providers {
    kubernetes = {
      source = "hashicorp/kubernetes"
    }
    kubectl = {
      source = "alekc/kubectl"
    }
  }
}

locals {
  m = var.fixture_metadata
}

resource "kubernetes_namespace_v1" "test" {
  metadata {
    name = local.m.test_workload_namespace
    labels = {
      "pod-security.kubernetes.io/enforce" = "restricted"
      "pod-security.kubernetes.io/audit"   = "restricted"
      "pod-security.kubernetes.io/warn"    = "restricted"
      Owner                                = "finos-ccc"
      Environment                          = "nonprod"
      DataClassification                   = "internal"
    }
  }
}

resource "kubernetes_namespace_v1" "network_control" {
  metadata {
    name = local.m.network_control_namespace
    labels = {
      "pod-security.kubernetes.io/enforce" = "baseline"
      Owner                                = "finos-ccc"
      Environment                          = "nonprod"
      DataClassification                   = "internal"
    }
  }
}

resource "kubernetes_service_account_v1" "wi_bound" {
  metadata {
    name      = local.m.test_workload_service_account
    namespace = kubernetes_namespace_v1.test.metadata[0].name
    annotations = {
      "iam.gke.io/gcp-service-account" = var.wi_bound_email
    }
  }
}

resource "kubernetes_service_account_v1" "wi_unbound" {
  metadata {
    name      = local.m.test_workload_service_account_unbound
    namespace = kubernetes_namespace_v1.test.metadata[0].name
  }
}

resource "kubernetes_secret_v1" "protected" {
  metadata {
    name      = local.m.protected_secret_name
    namespace = kubernetes_namespace_v1.test.metadata[0].name
  }
  data = {
    value = "ccc-protected-secret-value"
  }
  type = "Opaque"
}

resource "kubernetes_secret_v1" "unrelated" {
  metadata {
    name      = local.m.unrelated_secret_name
    namespace = kubernetes_namespace_v1.test.metadata[0].name
  }
  data = {
    value = "ccc-unrelated-secret-value"
  }
  type = "Opaque"
}

resource "kubernetes_role_v1" "secret_get" {
  metadata {
    name      = "ccc-protected-secret-get"
    namespace = kubernetes_namespace_v1.test.metadata[0].name
  }
  rule {
    api_groups     = [""]
    resources      = ["secrets"]
    resource_names = [local.m.protected_secret_name]
    verbs          = ["get"]
  }
}

resource "kubernetes_role_binding_v1" "secret_get" {
  metadata {
    name      = "ccc-protected-secret-get"
    namespace = kubernetes_namespace_v1.test.metadata[0].name
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role_v1.secret_get.metadata[0].name
  }
  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account_v1.wi_bound.metadata[0].name
    namespace = kubernetes_namespace_v1.test.metadata[0].name
  }
}

# CN06: default-deny in test ns + allow path from control ns.
resource "kubernetes_network_policy_v1" "test_default_deny" {
  metadata {
    name      = "ccc-default-deny"
    namespace = kubernetes_namespace_v1.test.metadata[0].name
  }
  spec {
    pod_selector {}
    policy_types = ["Ingress", "Egress"]
  }
}

resource "kubernetes_network_policy_v1" "test_allow_dns" {
  metadata {
    name      = "ccc-allow-dns"
    namespace = kubernetes_namespace_v1.test.metadata[0].name
  }
  spec {
    pod_selector {}
    policy_types = ["Egress"]
    egress {
      ports {
        port     = "53"
        protocol = "UDP"
      }
      ports {
        port     = "53"
        protocol = "TCP"
      }
      to {
        namespace_selector {
          match_labels = {
            "kubernetes.io/metadata.name" = "kube-system"
          }
        }
      }
    }
  }
}

resource "kubernetes_network_policy_v1" "control_allow_from_labeled" {
  metadata {
    name      = "ccc-allow-from-network-probe"
    namespace = kubernetes_namespace_v1.network_control.metadata[0].name
  }
  spec {
    pod_selector {
      match_labels = {
        app = "ccc-allowed"
      }
    }
    policy_types = ["Ingress"]
    ingress {
      from {
        namespace_selector {
          match_labels = {
            "kubernetes.io/metadata.name" = local.m.test_workload_namespace
          }
        }
        pod_selector {
          match_labels = {
            role = "network-probe"
          }
        }
      }
      ports {
        port     = "8080"
        protocol = "TCP"
      }
    }
  }
}

resource "kubernetes_storage_class_v1" "approved" {
  metadata {
    name = local.m.approved_storage_class
  }
  storage_provisioner    = "pd.csi.storage.gke.io"
  reclaim_policy         = "Delete"
  volume_binding_mode    = "WaitForFirstConsumer"
  allow_volume_expansion = false
  parameters = {
    type = "pd-balanced"
  }
}

resource "kubernetes_storage_class_v1" "blocked" {
  metadata {
    name = local.m.disallowed_storage_class
    annotations = {
      "ccc.finos.org/disallowed" = "true"
    }
  }
  storage_provisioner = "pd.csi.storage.gke.io"
  reclaim_policy      = "Delete"
  volume_binding_mode = "WaitForFirstConsumer"
  parameters = {
    type = "pd-standard"
  }
}

resource "kubernetes_limit_range_v1" "test" {
  metadata {
    name      = "ccc-limitrange"
    namespace = kubernetes_namespace_v1.test.metadata[0].name
  }
  spec {
    limit {
      type = "Container"
      default = {
        cpu    = "100m"
        memory = "128Mi"
      }
      default_request = {
        cpu    = "50m"
        memory = "64Mi"
      }
      max = {
        cpu    = "500m"
        memory = "512Mi"
      }
      min = {
        cpu    = "10m"
        memory = "16Mi"
      }
    }
  }
}

resource "kubernetes_resource_quota_v1" "test" {
  metadata {
    name      = "ccc-quota"
    namespace = kubernetes_namespace_v1.test.metadata[0].name
  }
  spec {
    hard = {
      "requests.cpu"    = "2"
      "requests.memory" = "2Gi"
      "limits.cpu"      = "4"
      "limits.memory"   = "4Gi"
      pods              = "20"
    }
  }
}

# Native ValidatingAdmissionPolicy: deny tag-only images and static cloud credential env keys (CN03.AR02 / CN04.AR01).
# kubectl_manifest (not kubernetes_manifest) so these apply in the same run as the
# cluster: kubernetes_manifest needs a live API at plan time and fails first-apply.
resource "kubectl_manifest" "vap_images" {
  yaml_body = yamlencode({
    apiVersion = "admissionregistration.k8s.io/v1"
    kind       = "ValidatingAdmissionPolicy"
    metadata = {
      name = "ccc-deny-tag-only-images"
    }
    spec = {
      failurePolicy = "Fail"
      matchConstraints = {
        resourceRules = [{
          apiGroups   = [""]
          apiVersions = ["v1"]
          operations  = ["CREATE", "UPDATE"]
          resources   = ["pods"]
        }]
      }
      validations = [{
        expression = "object.spec.containers.all(c, c.image.contains('@sha256:') || c.image.contains('@sha512:')) && (!has(object.spec.initContainers) || object.spec.initContainers.all(c, c.image.contains('@sha256:') || c.image.contains('@sha512:')))"
        message    = "images must be digest-pinned"
      }]
    }
  })
}

resource "kubectl_manifest" "vap_images_binding" {
  yaml_body = yamlencode({
    apiVersion = "admissionregistration.k8s.io/v1"
    kind       = "ValidatingAdmissionPolicyBinding"
    metadata = {
      name = "ccc-deny-tag-only-images"
    }
    spec = {
      policyName        = "ccc-deny-tag-only-images"
      validationActions = ["Deny"]
      matchResources = {
        namespaceSelector = {
          matchExpressions = [{
            key      = "kubernetes.io/metadata.name"
            operator = "In"
            values   = [local.m.test_workload_namespace]
          }]
        }
      }
    }
  })
  depends_on = [kubectl_manifest.vap_images]
}

resource "kubectl_manifest" "vap_static_creds" {
  yaml_body = yamlencode({
    apiVersion = "admissionregistration.k8s.io/v1"
    kind       = "ValidatingAdmissionPolicy"
    metadata = {
      name = "ccc-deny-static-cloud-credentials"
    }
    spec = {
      failurePolicy = "Fail"
      matchConstraints = {
        resourceRules = [{
          apiGroups   = [""]
          apiVersions = ["v1"]
          operations  = ["CREATE", "UPDATE"]
          resources   = ["pods"]
        }]
      }
      validations = [{
        expression = "!object.spec.containers.exists(c, c.env.exists(e, e.name in ['AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AZURE_CLIENT_SECRET','GOOGLE_APPLICATION_CREDENTIALS']))"
        message    = "static cloud credentials must not be embedded in workloads"
      }]
    }
  })
}

resource "kubectl_manifest" "vap_static_creds_binding" {
  yaml_body = yamlencode({
    apiVersion = "admissionregistration.k8s.io/v1"
    kind       = "ValidatingAdmissionPolicyBinding"
    metadata = {
      name = "ccc-deny-static-cloud-credentials"
    }
    spec = {
      policyName        = "ccc-deny-static-cloud-credentials"
      validationActions = ["Deny"]
      matchResources = {
        namespaceSelector = {
          matchExpressions = [{
            key      = "kubernetes.io/metadata.name"
            operator = "In"
            values   = [local.m.test_workload_namespace]
          }]
        }
      }
    }
  })
  depends_on = [kubectl_manifest.vap_static_creds]
}

resource "kubectl_manifest" "vap_blocked_sc" {
  yaml_body = yamlencode({
    apiVersion = "admissionregistration.k8s.io/v1"
    kind       = "ValidatingAdmissionPolicy"
    metadata = {
      name = "ccc-deny-blocked-storage-class"
    }
    spec = {
      failurePolicy = "Fail"
      matchConstraints = {
        resourceRules = [{
          apiGroups   = [""]
          apiVersions = ["v1"]
          operations  = ["CREATE"]
          resources   = ["persistentvolumeclaims"]
        }]
      }
      validations = [{
        expression = "!has(object.spec.storageClassName) || object.spec.storageClassName != '${local.m.disallowed_storage_class}'"
        message    = "disallowed storage class"
        }, {
        expression = "object.spec.accessModes.all(m, m != '${local.m.disallowed_access_mode}')"
        message    = "disallowed access mode"
      }]
    }
  })
  depends_on = [kubectl_manifest.vap_blocked_sc]
}
