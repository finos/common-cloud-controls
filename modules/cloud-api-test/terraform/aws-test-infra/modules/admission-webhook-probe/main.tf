terraform {
  required_providers {
    kubernetes = {
      source = "hashicorp/kubernetes"
    }
    tls = {
      source = "hashicorp/tls"
    }
  }
}

locals {
  m = var.fixture_metadata
}

resource "tls_private_key" "webhook" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_self_signed_cert" "webhook" {
  private_key_pem = tls_private_key.webhook.private_key_pem

  subject {
    common_name  = "${local.m.webhook_probe_service}.${local.m.webhook_probe_namespace}.svc"
    organization = "FINOS CCC"
  }

  validity_period_hours = 8760
  early_renewal_hours   = 168

  dns_names = [
    local.m.webhook_probe_service,
    "${local.m.webhook_probe_service}.${local.m.webhook_probe_namespace}",
    "${local.m.webhook_probe_service}.${local.m.webhook_probe_namespace}.svc",
    "${local.m.webhook_probe_service}.${local.m.webhook_probe_namespace}.svc.cluster.local",
  ]

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]
}

resource "kubernetes_namespace_v1" "probe" {
  metadata {
    name = local.m.webhook_probe_namespace
    labels = {
      Owner       = "finos-ccc"
      Environment = "nonprod"
    }
  }
}

resource "kubernetes_namespace_v1" "test" {
  metadata {
    name = local.m.webhook_probe_test_namespace
    labels = {
      "ccc.finos.org/webhook-probe" = "true"
      Owner                         = "finos-ccc"
      Environment                   = "nonprod"
    }
  }
}

resource "kubernetes_secret_v1" "tls" {
  metadata {
    name      = "${local.m.webhook_probe_deployment}-tls"
    namespace = kubernetes_namespace_v1.probe.metadata[0].name
  }
  type = "kubernetes.io/tls"
  data = {
    "tls.crt" = tls_self_signed_cert.webhook.cert_pem
    "tls.key" = tls_private_key.webhook.private_key_pem
  }
}

resource "kubernetes_service_account_v1" "probe" {
  metadata {
    name      = local.m.webhook_probe_deployment
    namespace = kubernetes_namespace_v1.probe.metadata[0].name
  }
}

resource "kubernetes_deployment_v1" "probe" {
  metadata {
    name      = local.m.webhook_probe_deployment
    namespace = kubernetes_namespace_v1.probe.metadata[0].name
    labels = {
      app = local.m.webhook_probe_deployment
    }
  }
  spec {
    replicas = local.m.enabled_replicas
    selector {
      match_labels = {
        app = local.m.webhook_probe_deployment
      }
    }
    template {
      metadata {
        labels = {
          app = local.m.webhook_probe_deployment
        }
      }
      spec {
        service_account_name = kubernetes_service_account_v1.probe.metadata[0].name
        container {
          name  = "webhook"
          image = var.probe_image
          port {
            container_port = 8443
            name           = "https"
          }
          volume_mount {
            name       = "tls"
            mount_path = "/tls"
            read_only  = true
          }
          # Real admission-webhook-probe image must serve TLS on 8443 with /validate /healthz /readyz.
          # Placeholder pause image has no listener; omit probes so the Deployment can become Ready for bring-up.
          resources {
            requests = {
              cpu    = "50m"
              memory = "64Mi"
            }
            limits = {
              cpu    = "200m"
              memory = "128Mi"
            }
          }
          security_context {
            allow_privilege_escalation = false
            capabilities {
              drop = ["ALL"]
            }
          }
        }
        volume {
          name = "tls"
          secret {
            secret_name = kubernetes_secret_v1.tls.metadata[0].name
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "probe" {
  metadata {
    name      = local.m.webhook_probe_service
    namespace = kubernetes_namespace_v1.probe.metadata[0].name
  }
  spec {
    selector = {
      app = local.m.webhook_probe_deployment
    }
    port {
      port        = 443
      target_port = 8443
      protocol    = "TCP"
      name        = "https"
    }
  }
}

# Fixture-controller RBAC: scale Deployment + read readiness only in the probe namespace.
resource "kubernetes_role_v1" "controller" {
  metadata {
    name      = "ccc-admission-webhook-controller"
    namespace = kubernetes_namespace_v1.probe.metadata[0].name
  }
  rule {
    api_groups = ["apps"]
    resources  = ["deployments", "deployments/scale"]
    verbs      = ["get", "list", "watch", "patch", "update"]
  }
  rule {
    api_groups = [""]
    resources  = ["pods", "endpoints"]
    verbs      = ["get", "list", "watch"]
  }
  rule {
    api_groups = ["discovery.k8s.io"]
    resources  = ["endpointslices"]
    verbs      = ["get", "list", "watch"]
  }
}

resource "kubernetes_role_binding_v1" "controller" {
  metadata {
    name      = "ccc-admission-webhook-controller"
    namespace = kubernetes_namespace_v1.probe.metadata[0].name
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role_v1.controller.metadata[0].name
  }
  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account_v1.probe.metadata[0].name
    namespace = kubernetes_namespace_v1.probe.metadata[0].name
  }
}

resource "kubernetes_validating_webhook_configuration_v1" "probe" {
  metadata {
    name = local.m.webhook_probe_configuration
  }

  webhook {
    name = "ccc-admission-webhook-probe.finos.org"

    admission_review_versions = ["v1"]
    side_effects              = "None"
    timeout_seconds           = 5
    failure_policy            = "Fail"

    client_config {
      service {
        name      = kubernetes_service_v1.probe.metadata[0].name
        namespace = kubernetes_namespace_v1.probe.metadata[0].name
        path      = "/validate"
        port      = 443
      }
      ca_bundle = base64encode(tls_self_signed_cert.webhook.cert_pem)
    }

    rule {
      api_groups   = [""]
      api_versions = ["v1"]
      operations   = ["CREATE", "UPDATE"]
      resources    = ["pods"]
      scope        = "Namespaced"
    }

    namespace_selector {
      match_labels = {
        "ccc.finos.org/webhook-probe" = "true"
      }
    }

    object_selector {
      match_labels = {
        "ccc.finos.org/webhook-probe-object" = "true"
      }
    }
  }

  depends_on = [
    kubernetes_deployment_v1.probe,
    kubernetes_service_v1.probe,
  ]
}
