resource "google_compute_network" "this" {
  name                    = "finos-ccc-integration-vm-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "this" {
  name          = "finos-ccc-integration-vm-subnet"
  ip_cidr_range = "10.80.1.0/24"
  region        = var.region
  network       = google_compute_network.this.id
}

resource "google_compute_firewall" "ssh" {
  name    = "finos-ccc-integration-vm-ssh"
  network = google_compute_network.this.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["10.0.0.0/8"]
  target_tags   = ["cfi-vm"]
}

resource "google_compute_instance" "main" {
  name         = "finos-ccc-integration-vm-main"
  machine_type = "e2-micro"
  zone         = var.zone
  tags         = ["cfi-vm"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 10
      type  = "pd-standard"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.this.id
    access_config {}
  }

  labels = merge(var.common_labels, {
    cficontrolset = "ccc-vm"
  })
}
