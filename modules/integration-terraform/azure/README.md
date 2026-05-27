# Azure Integration Terraform

Creates Azure fixtures for:

- `virtual-machines`: Linux VM in a dedicated VNet/subnet with NSG-restricted SSH ingress.
- `serverless-computing`: two Linux Function Apps (`good` with public access disabled, `bad` with public access enabled).
