# GCP Integration Terraform

Creates GCP fixtures for:

- `object-storage`: one Cloud Storage bucket with retention policy enabled.
- `virtual-machines`: one Compute Engine VM in a dedicated VPC/subnet with firewall-restricted SSH ingress.
- `serverless-computing`: one Cloud Functions Gen2 function with internal-only ingress.
- `vpc`: dedicated VPC/network fixtures including flow-log-enabled subnet for CN03/CN04 style checks.
- `logging`: Cloud Logging integration defaults (including VPC flow log stream name).
