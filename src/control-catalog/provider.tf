terraform {
  cloud {
    organization = "CCC-Testing"

    workspaces {
      name = "ccc-controls-testing"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}