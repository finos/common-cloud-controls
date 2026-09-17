# CN06 listeners + egress allow for AttemptWorkloadNetworkFlow.
# Image is busybox so Jobs can wget/httpd without a custom FINOS image push.

locals {
  network_probe_image = "busybox:1.36"
  network_listeners = {
    control = {
      namespace = kubernetes_namespace_v1.network_control.metadata[0].name
      app       = "ccc-control"
    }
    allowed = {
      namespace = kubernetes_namespace_v1.network_control.metadata[0].name
      app       = "ccc-allowed"
    }
    denied = {
      namespace = kubernetes_namespace_v1.network_control.metadata[0].name
      app       = "ccc-denied"
    }
    isolated = {
      namespace = kubernetes_namespace_v1.test.metadata[0].name
      app       = "ccc-isolated"
    }
  }
}

resource "kubernetes_network_policy_v1" "control_default_deny_ingress" {
  metadata {
    name      = "ccc-default-deny-ingress"
    namespace = kubernetes_namespace_v1.network_control.metadata[0].name
  }
  spec {
    pod_selector {}
    policy_types = ["Ingress"]
  }
}

resource "kubernetes_network_policy_v1" "control_allow_from_control_probe" {
  metadata {
    name      = "ccc-allow-from-network-control"
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
        pod_selector {
          match_labels = {
            app = "ccc-network-control"
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

resource "kubernetes_network_policy_v1" "test_allow_probe_to_allowed" {
  metadata {
    name      = "ccc-allow-probe-to-allowed"
    namespace = kubernetes_namespace_v1.test.metadata[0].name
  }
  spec {
    pod_selector {
      match_labels = {
        role = "network-probe"
      }
    }
    policy_types = ["Egress"]
    egress {
      ports {
        port     = "8080"
        protocol = "TCP"
      }
      to {
        namespace_selector {
          match_labels = {
            "kubernetes.io/metadata.name" = local.m.network_control_namespace
          }
        }
        pod_selector {
          match_labels = {
            app = "ccc-allowed"
          }
        }
      }
    }
  }
}

resource "kubernetes_deployment_v1" "network_listener" {
  for_each = local.network_listeners

  metadata {
    name      = each.value.app
    namespace = each.value.namespace
    labels = {
      app = each.value.app
    }
  }
  spec {
    replicas = 1
    selector {
      match_labels = {
        app = each.value.app
      }
    }
    template {
      metadata {
        labels = {
          app = each.value.app
        }
      }
      spec {
        security_context {
          run_as_non_root = true
          run_as_user     = 65534
          seccomp_profile {
            type = "RuntimeDefault"
          }
        }
        container {
          name              = "listener"
          image             = local.network_probe_image
          image_pull_policy = "IfNotPresent"
          command           = ["/bin/sh", "-c"]
          args              = ["mkdir -p /tmp/www && echo ok >/tmp/www/health && exec httpd -f -p 8080 -h /tmp/www"]
          port {
            container_port = 8080
            name           = "http"
          }
          security_context {
            allow_privilege_escalation = false
            run_as_non_root            = true
            run_as_user                = 65534
            capabilities {
              drop = ["ALL"]
            }
            seccomp_profile {
              type = "RuntimeDefault"
            }
          }
          readiness_probe {
            http_get {
              path = "/health"
              port = 8080
            }
            initial_delay_seconds = 1
            period_seconds        = 2
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "network_listener" {
  for_each = local.network_listeners

  metadata {
    name      = each.value.app
    namespace = each.value.namespace
    labels = {
      app = each.value.app
    }
  }
  spec {
    selector = {
      app = each.value.app
    }
    port {
      name        = "http"
      port        = 8080
      target_port = 8080
      protocol    = "TCP"
    }
  }
}
