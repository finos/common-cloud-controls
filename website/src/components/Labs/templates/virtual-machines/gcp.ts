import type { ExampleSource } from "../index";

/** Google Cloud (Compute Engine) variants of each example: a Linux application server. */
export const EXAMPLES: ExampleSource[] = [
  {
    example: "basic",
    description: "A Compute Engine instance on the default network with an external IP and metadata SSH keys, relying on Google Cloud defaults for everything else.",
    code: `provider "google" {
  project = "acme-app-prod"
  region  = "europe-west2"
}

resource "google_compute_instance" "app" {
  name         = "app-server"
  machine_type = "e2-small"
  zone         = "europe-west2-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  # The default network ships with SSH and RDP open to 0.0.0.0/0
  network_interface {
    network = "default"
    access_config {}
  }

  metadata = {
    "ssh-keys" = "admin:\${file("~/.ssh/id_ed25519.pub")}"
  }
}
`,
  },
  {
    example: "intermediate",
    description:
      "The instance gets its own VPC, OS Login, the Ops Agent and SSH only through Identity-Aware Proxy. It still has an external IP serving HTTPS to the internet, Google-managed disk keys and no snapshot schedule.",
    code: `provider "google" {
  project = "acme-app-prod"
  region  = "europe-west2"
}

resource "google_compute_network" "main" {
  name                    = "app-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "app" {
  name          = "app-subnet"
  network       = google_compute_network.main.id
  region        = "europe-west2"
  ip_cidr_range = "10.40.1.0/24"
}

resource "google_compute_firewall" "ssh_from_iap" {
  name          = "allow-ssh-from-iap"
  network       = google_compute_network.main.name
  source_ranges = ["35.235.240.0/20"]
  target_tags   = ["app"]

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}

resource "google_compute_firewall" "https" {
  name          = "allow-https"
  network       = google_compute_network.main.name
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["app"]

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }
}

resource "google_compute_instance" "app" {
  name         = "app-server"
  machine_type = "e2-small"
  zone         = "europe-west2-a"
  tags         = ["app"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.app.id
    access_config {}
  }

  metadata = {
    "enable-oslogin" = "TRUE"
  }

  metadata_startup_script = "curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh && bash add-google-cloud-ops-agent-repo.sh --also-install"
}
`,
  },
  {
    example: "hardened",
    description: "A private instance reached only through Identity-Aware Proxy with OS Login, a rotating Cloud KMS key on its boot disk, the Ops Agent shipping its logs, and daily snapshots.",
    code: `provider "google" {
  project = "acme-app-prod"
  region  = "europe-west2"
}

data "google_project" "current" {}

resource "google_kms_key_ring" "compute" {
  name     = "compute"
  location = "europe-west2"
}

resource "google_kms_crypto_key" "disks" {
  name            = "app-disks"
  key_ring        = google_kms_key_ring.compute.id
  rotation_period = "7776000s" # CCC.Core.CN11: rotate every 90 days

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "HSM"
  }
}

resource "google_kms_crypto_key_iam_member" "compute_agent" {
  crypto_key_id = google_kms_crypto_key.disks.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:service-\${data.google_project.current.number}@compute-system.iam.gserviceaccount.com"
}

resource "google_compute_network" "main" {
  name                    = "app-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "app" {
  name                     = "app-subnet"
  network                  = google_compute_network.main.id
  region                   = "europe-west2"
  ip_cidr_range            = "10.40.1.0/24"
  private_ip_google_access = true
}

# SSH only through Identity-Aware Proxy (CCC.Core.CN05)
resource "google_compute_firewall" "ssh_from_iap" {
  name          = "allow-ssh-from-iap"
  network       = google_compute_network.main.name
  source_ranges = ["35.235.240.0/20"]
  target_tags   = ["app"]

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}

# Daily snapshots stored in a second location (CCC.Core.CN08)
resource "google_compute_resource_policy" "daily" {
  name   = "app-daily-snapshots"
  region = "europe-west2"

  snapshot_schedule_policy {
    schedule {
      daily_schedule {
        days_in_cycle = 1
        start_time    = "03:00"
      }
    }
    retention_policy {
      max_retention_days = 30
    }
    snapshot_properties {
      storage_locations = ["europe-west1"]
    }
  }
}

resource "google_service_account" "app" {
  account_id   = "app-server"
  display_name = "App server"
}

resource "google_compute_instance" "app" {
  name         = "app-server"
  machine_type = "e2-small"
  zone         = "europe-west2-a"
  tags         = ["app"]

  boot_disk {
    kms_key_self_link = google_kms_crypto_key.disks.id # CCC.Core.CN11: CMEK
    initialize_params {
      image             = "debian-cloud/debian-12"
      resource_policies = [google_compute_resource_policy.daily.id]
    }
  }

  # No access_config: no external IP (CCC.Core.CN05)
  network_interface {
    subnetwork = google_compute_subnetwork.app.id
  }

  metadata = {
    "enable-oslogin"         = "TRUE" # CCC.Core.CN03: SSH through IAM identities
    "block-project-ssh-keys" = "TRUE"
  }

  # Ops Agent ships OS and login logs to Cloud Logging (CCC.Core.CN09)
  metadata_startup_script = "curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh && bash add-google-cloud-ops-agent-repo.sh --also-install"

  service_account {
    email  = google_service_account.app.email
    scopes = ["cloud-platform"]
  }

  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }

  depends_on = [google_kms_crypto_key_iam_member.compute_agent]
}
`,
  },
];
