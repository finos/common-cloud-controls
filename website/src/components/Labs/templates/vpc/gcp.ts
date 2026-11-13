import type { ExampleSource } from "../index";

/** Google Cloud (VPC network) variants of each example: a VPC network for a two-tier web application. */
export const EXAMPLES: ExampleSource[] = [
  {
    example: "basic",
    description:
      "A typical first VPC network: auto mode (a subnetwork in every region, none with flow logs) and firewall rules that open SSH and HTTP to the whole internet.",
    code: `provider "google" {
  project = "acme-app-prod"
  region  = "europe-west2"
}

resource "google_compute_network" "main" {
  name = "acme-app"
}

resource "google_compute_firewall" "allow_ssh" {
  name    = "acme-app-allow-ssh"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
}

resource "google_compute_firewall" "allow_web" {
  name    = "acme-app-allow-web"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }
}
`,
  },
  {
    example: "intermediate",
    description:
      "A custom-mode network with one regional subnetwork, SSH only through IAP and HTTPS only. But flow logs sample half the flows, blocked connections aren't logged, and it peers with a partner's network with no organization policy allow-list.",
    code: `provider "google" {
  project = "acme-app-prod"
  region  = "europe-west2"
}

resource "google_compute_network" "main" {
  name                    = "acme-app"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "web" {
  name                     = "acme-app-web"
  network                  = google_compute_network.main.id
  region                   = "europe-west2"
  ip_cidr_range            = "10.20.1.0/24"
  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
  }
}

resource "google_compute_firewall" "allow_https" {
  name    = "acme-app-allow-https"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  source_ranges = ["0.0.0.0/0"]
}

resource "google_compute_firewall" "allow_iap_ssh" {
  name    = "acme-app-allow-iap-ssh"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"]
}

resource "google_compute_network_peering" "partner" {
  name         = "acme-app-to-partner"
  network      = google_compute_network.main.self_link
  peer_network = "projects/partner-shared-net/global/networks/partner-vpc"
}
`,
  },
  {
    example: "hardened",
    description:
      "A VPC network configured to satisfy every statically-checkable requirement at TLP:AMBER: custom mode, full flow logs, ingress only from Google's load balancers and IAP, logged deny-all, and organization policies for default networks and peering.",
    code: `provider "google" {
  project = "acme-app-prod"
  region  = "europe-west2" # CCC.Core.CN06: trusted region
}

variable "org_id" {
  type    = string
  default = "123456789012"
}

resource "google_compute_network" "main" {
  name                    = "acme-app"
  auto_create_subnetworks = false # CCC.VPC.CN01: no auto-created subnetworks
}

# CCC.VPC.CN04 / CCC.Core.CN09: every flow, with full metadata, to Cloud Logging
resource "google_compute_subnetwork" "web" {
  name                     = "acme-app-web"
  network                  = google_compute_network.main.id
  region                   = "europe-west2"
  ip_cidr_range            = "10.20.1.0/24"
  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 1.0
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# CCC.Core.CN05 / CN01: HTTPS only, from Google Cloud load balancers and health checks
resource "google_compute_firewall" "allow_lb_https" {
  name          = "acme-app-allow-lb-https"
  network       = google_compute_network.main.name
  source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }
}

# CCC.Core.CN05: SSH only through Identity-Aware Proxy
resource "google_compute_firewall" "allow_iap_ssh" {
  name          = "acme-app-allow-iap-ssh"
  network       = google_compute_network.main.name
  source_ranges = ["35.235.240.0/20"]

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}

# CCC.Core.CN07: log every blocked connection attempt
resource "google_compute_firewall" "deny_all_ingress" {
  name          = "acme-app-deny-all-ingress"
  network       = google_compute_network.main.name
  priority      = 65534
  source_ranges = ["0.0.0.0/0"]

  deny {
    protocol = "all"
  }

  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }
}

# CCC.VPC.CN01: new projects get no default network
resource "google_org_policy_policy" "skip_default_network" {
  name   = "organizations/\${var.org_id}/policies/compute.skipDefaultNetworkCreation"
  parent = "organizations/\${var.org_id}"

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}

# CCC.VPC.CN03: peering only with allow-listed networks
resource "google_org_policy_policy" "restrict_vpc_peering" {
  name   = "projects/acme-app-prod/policies/compute.restrictVpcPeering"
  parent = "projects/acme-app-prod"

  spec {
    rules {
      values {
        allowed_values = ["projects/acme-shared-vpc/global/networks/shared-hub"]
      }
    }
  }
}
`,
  },
];
