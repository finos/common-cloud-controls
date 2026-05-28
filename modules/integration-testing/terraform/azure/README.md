# Azure Integration Terraform

Creates Azure fixtures for:

- `object-storage`: one Storage Account + private Blob container for object-storage control tests.
- `virtual-machines`: one Linux VM in a dedicated VNet/subnet with NSG-restricted SSH ingress.
- `serverless-computing`: one Linux Function App with public network access disabled.
