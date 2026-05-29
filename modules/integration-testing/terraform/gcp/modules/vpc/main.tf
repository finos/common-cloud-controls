# Three peer VPCs plus dedicated vm-vpc in the VM module = 4 networks (under default
# quota of 5). Second allow-list / disallowed / non-allowlisted ids reuse outputs.

resource "google_compute_network" "good" {
  name                    = "finos-ccc-integration-vpc"
  auto_create_subnetworks = false
  project                 = var.project_id
}

resource "google_compute_subnetwork" "good_public" {
  name          = "finos-ccc-integration-vpc-public"
  ip_cidr_range = "10.90.1.0/24"
  region        = var.region
  project       = var.project_id
  network       = google_compute_network.good.id

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 1.0
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

resource "google_compute_network" "bad" {
  name                    = "finos-ccc-integration-vpc-bad"
  auto_create_subnetworks = false
  project                 = var.project_id
}

resource "google_compute_subnetwork" "bad_public" {
  name          = "finos-ccc-integration-vpc-bad-public"
  ip_cidr_range = "10.91.1.0/24"
  region        = var.region
  project       = var.project_id
  network       = google_compute_network.bad.id
}

resource "google_compute_network" "cn03_allowed_01" {
  name                    = "finos-ccc-integration-vpc-cn03-allowed-01"
  auto_create_subnetworks = false
  project                 = var.project_id
}
