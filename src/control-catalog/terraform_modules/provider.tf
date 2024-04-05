# Organization Configuration
terraform {
  cloud {
    organization = "CCC-Testing"

    workspaces {
      name = "ccc-controls-testing"
    }
  }
}

# Provider List
provider "aws" {
  region = "eu-west-3"
}

provider "google" {
  project     = "common-cloud-controls-testing"
  region      = "us-central1"
}