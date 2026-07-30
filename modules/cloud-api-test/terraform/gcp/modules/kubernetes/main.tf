data "google_project" "current" {
  project_id = var.project_id
}

locals {
  name_main = "finos-ccc-integration-k8s-main"
  name_bad  = "finos-ccc-integration-k8s-bad"

  cluster_labels = merge(var.common_labels, {
    cficontrolset      = "ccc-k8s"
    owner              = "finos-ccc"
    environment        = "nonprod"
    dataclassification = "internal"
  })

  fixture_metadata = {
    test_workload_namespace               = "ccc-test"
    test_workload_service_account         = "ccc-wi-sa"
    test_workload_service_account_unbound = "ccc-wi-sa-unbound"
    network_control_namespace             = "ccc-network-control"
    protected_secret_name                 = "ccc-protected-secret"
    unrelated_secret_name                 = "ccc-unrelated-secret"
    approved_storage_class                = "ccc-approved-sc"
    disallowed_storage_class              = "ccc-blocked-sc"
    approved_access_mode                  = "ReadWriteOnce"
    disallowed_access_mode                = "ReadWriteMany"
    required_metadata_keys                = ["Owner", "Environment", "DataClassification"]
  }
}

resource "google_compute_network" "k8s" {
  name                    = "finos-ccc-integration-k8s-vpc"
  auto_create_subnetworks = false
  project                 = var.project_id
}

resource "google_compute_subnetwork" "main" {
  name          = "finos-ccc-integration-k8s-main"
  ip_cidr_range = "10.84.0.0/20"
  region        = var.region
  project       = var.project_id
  network       = google_compute_network.k8s.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.85.0.0/16"
  }
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.86.0.0/20"
  }

  private_ip_google_access = true
}

resource "google_compute_subnetwork" "bad" {
  name          = "finos-ccc-integration-k8s-bad"
  ip_cidr_range = "10.87.0.0/20"
  region        = var.region
  project       = var.project_id
  network       = google_compute_network.k8s.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.88.0.0/16"
  }
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.89.0.0/20"
  }

  private_ip_google_access = true
}

resource "google_compute_router" "k8s" {
  name    = "finos-ccc-integration-k8s-router"
  region  = var.region
  project = var.project_id
  network = google_compute_network.k8s.id
}

resource "google_compute_router_nat" "k8s" {
  name                               = "finos-ccc-integration-k8s-nat"
  router                             = google_compute_router.k8s.name
  region                             = var.region
  project                            = var.project_id
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

resource "google_project_service" "container" {
  project            = var.project_id
  service            = "container.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "binaryauthz" {
  project            = var.project_id
  service            = "binaryauthorization.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "kms" {
  project            = var.project_id
  service            = "cloudkms.googleapis.com"
  disable_on_destroy = false
}

resource "google_service_account" "node" {
  account_id   = "finos-ccc-k8s-node"
  display_name = "FINOS CCC GKE node"
  project      = var.project_id
}

resource "google_project_iam_member" "node_metric" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.node.email}"
}

resource "google_project_iam_member" "node_log" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.node.email}"
}

resource "google_service_account" "wi_bound" {
  account_id   = "finos-ccc-k8s-wi-bound"
  display_name = "FINOS CCC GKE WI bound"
  project      = var.project_id
}

resource "google_storage_bucket" "wi_probe" {
  name                        = "finos-ccc-integration-k8s-wi-probe-${data.google_project.current.number}"
  location                    = var.region
  project                     = var.project_id
  uniform_bucket_level_access = true
  force_destroy               = true
  labels                      = local.cluster_labels
}

resource "google_storage_bucket_object" "wi_probe" {
  name    = "probe.txt"
  bucket  = google_storage_bucket.wi_probe.name
  content = "ccc-wi-probe-ok"
}

resource "google_storage_bucket_iam_member" "wi_bound" {
  bucket = google_storage_bucket.wi_probe.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.wi_bound.email}"
}

resource "google_kms_key_ring" "gke" {
  name       = "finos-ccc-integration-k8s"
  location   = var.region
  project    = var.project_id
  depends_on = [google_project_service.kms]
}

resource "google_kms_crypto_key" "gke" {
  name            = "gke-database"
  key_ring        = google_kms_key_ring.gke.id
  rotation_period = "7776000s"
}

resource "google_kms_crypto_key_iam_member" "gke" {
  crypto_key_id = google_kms_crypto_key.gke.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:service-${data.google_project.current.number}@container-engine-robot.iam.gserviceaccount.com"
}

# Native Binary Authorization enabled in dry-run so unsigned paths are observable without bricking system pods.
# Strict attestation enforcement is left for a signed-image pipeline (CN04.AR02).
resource "google_binary_authorization_policy" "main" {
  project = var.project_id

  default_admission_rule {
    evaluation_mode  = "ALWAYS_ALLOW"
    enforcement_mode = "DRYRUN_AUDIT_LOG_ONLY"
  }

  admission_whitelist_patterns {
    name_pattern = "gcr.io/google-containers/*"
  }
  admission_whitelist_patterns {
    name_pattern = "gke.gcr.io/*"
  }
  admission_whitelist_patterns {
    name_pattern = "registry.k8s.io/*"
  }

  depends_on = [google_project_service.binaryauthz]
}

resource "google_container_cluster" "main" {
  name                     = local.name_main
  location                 = var.region
  project                  = var.project_id
  node_locations           = ["${var.region}-a"]
  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.k8s.name
  subnetwork = google_compute_subnetwork.main.name

  networking_mode = "VPC_NATIVE"
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  master_authorized_networks_config {
    dynamic "cidr_blocks" {
      for_each = var.api_authorized_cidrs
      content {
        cidr_block   = cidr_blocks.value
        display_name = "authorized-${cidr_blocks.key}"
      }
    }
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  release_channel {
    channel = "REGULAR"
  }

  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS", "APISERVER", "CONTROLLER_MANAGER", "SCHEDULER"]
  }

  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS"]
  }

  database_encryption {
    state    = "ENCRYPTED"
    key_name = google_kms_crypto_key.gke.id
  }

  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }

  network_policy {
    enabled  = true
    provider = "CALICO"
  }

  addons_config {
    network_policy_config {
      disabled = false
    }
  }

  resource_labels = local.cluster_labels

  depends_on = [
    google_project_service.container,
    google_compute_router_nat.k8s,
    google_kms_crypto_key_iam_member.gke,
    google_binary_authorization_policy.main,
  ]
}

resource "google_container_node_pool" "main" {
  name     = "main"
  cluster  = google_container_cluster.main.name
  location = var.region
  project  = var.project_id

  node_count = 1

  node_config {
    machine_type    = var.node_machine_type
    service_account = google_service_account.node.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]
    spot            = true

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    labels = local.cluster_labels
    metadata = {
      disable-legacy-endpoints = "true"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  autoscaling {
    min_node_count = 1
    max_node_count = 2
  }
}

resource "google_service_account_iam_member" "wi_bound_wif" {
  service_account_id = google_service_account.wi_bound.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${local.fixture_metadata.test_workload_namespace}/${local.fixture_metadata.test_workload_service_account}]"
  depends_on         = [google_container_cluster.main]
}

resource "google_container_cluster" "bad" {
  name               = local.name_bad
  location           = var.region
  project            = var.project_id
  node_locations     = ["${var.region}-a"]
  initial_node_count = 1

  network    = google_compute_network.k8s.name
  subnetwork = google_compute_subnetwork.bad.name

  networking_mode = "VPC_NATIVE"
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "0.0.0.0/0"
      display_name = "open"
    }
  }

  release_channel {
    channel = "REGULAR"
  }

  node_config {
    machine_type    = var.node_machine_type
    service_account = google_service_account.node.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]
    spot            = true
    labels = merge(local.cluster_labels, {
      cfirole = "bad"
    })
  }

  resource_labels = merge(local.cluster_labels, {
    cfirole = "bad"
  })

  depends_on = [
    google_project_service.container,
    google_compute_router_nat.k8s,
  ]
}
