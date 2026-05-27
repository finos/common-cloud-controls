# Integration Terraform

This folder contains example terraform for behavioural test fixtures.

Goal: stand up enough infrastructure to exercise cloud-api and feature codepaths for:

- `virtual-machines`
- `serverless-computing`

Current AWS module behavior:

- `virtual-machines`: creates a small EC2 instance (`t3.micro`) in a dedicated test VPC/subnet with an encrypted root EBS volume, SG-restricted SSH ingress, and CFI tags.
- `serverless-computing`: creates two Lambda functions from a simple inline Python handler that echoes request payloads; the "good" function has no public Function URL, while the "bad" function intentionally exposes a public Function URL for negative-path testing.

Passing every behavioural test is not required for this stack.

## AWS

```bash
cd modules/integration-terraform/aws
terraform init
terraform apply -var='deployment_suffix=20260527t120000z'
```

Use `terraform output` values to populate:

- `cfi-testing/privateer-config/aws-virtual-machines.yml`
- `cfi-testing/privateer-config/aws-serverless-good.yml`
- `cfi-testing/privateer-config/aws-serverless-bad.yml`

## Azure

```bash
cd modules/integration-terraform/azure
terraform init
terraform apply -var='deployment_suffix=20260527t120000z' -var='subscription_id=<sub-id>'
```

## GCP

```bash
cd modules/integration-terraform/gcp
terraform init
terraform apply -var='deployment_suffix=20260527t120000z' -var='project_id=<project-id>'
```
