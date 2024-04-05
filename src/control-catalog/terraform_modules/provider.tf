terraform {
  cloud {
    organization = "CCC-Testing"

    workspaces {
      name = "ccc-controls-testing"
    }
  }
}

# AWS Provider - Latest
provider "aws" {
  region = "eu-west-3"
}