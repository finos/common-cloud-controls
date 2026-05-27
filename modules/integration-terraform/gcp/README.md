# GCP Integration Terraform

Creates GCP fixtures for:

- `virtual-machines`: Compute Engine VM in a dedicated VPC/subnet with firewall-restricted SSH ingress.
- `serverless-computing`: two Cloud Functions Gen2 (`good` internal-only ingress, `bad` public ingress).
