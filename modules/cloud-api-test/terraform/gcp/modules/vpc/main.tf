# Single cheap VPC for cloud-api driver coverage (flow logs on the public subnet).
# The VM module owns a dedicated network. Multi-VPC topologies belong in external CFI fixtures.

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
