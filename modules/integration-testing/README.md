# Integration Terraform

This folder contains example terraform for behavioural test fixtures.

Goal: stand up enough infrastructure to exercise cloud-api for the various functions it exposes.

## Naming convention

Use one naming contract for all integration fixtures:

- Include the integration marker string `finos-ccc-integration` in every resource name where the platform allows it.
- Preferred pattern: `finos-ccc-integration-<role>` (for example `finos-ccc-integration-fn-main`, `finos-ccc-integration-vpc-bad`).
- If a resource type has naming constraints (for example, lowercase alphanumeric only or no hyphens), use a normalized marker such as `finoscccintegration` while keeping the same semantic role suffix.

## Fixture count

Provision **one testable resource per service type**. Supporting network, storage, and IAM for that resource is expected.

| Service | Fixture count | Notes |
|---------|---------------|-------|
| `virtual-machines` | 1 VM | `finos-ccc-integration-vm-main` |
| `serverless-computing` | 1 function | `finos-ccc-integration-fn-main` |
| `vpc` | good + bad (+ CN03 peers on AWS) | only service with intentional good/bad fixtures |

Current AWS module behavior:

- `virtual-machines`: one EC2 instance (`t3.micro`) in a dedicated test VPC/subnet with encrypted root EBS volume and SG-restricted SSH ingress.
- `serverless-computing`: one Lambda function from a simple inline Python handler.
- `vpc`: compliant and non-compliant VPC fixtures plus CN03 peer networks (see `modules/vpc/`).

Passing every behavioural test is not required for this stack.

## AWS

```bash
cd modules/integration-terraform/aws
terraform init
terraform apply
```

Use `terraform output` values to populate:

- `cfi-testing/privateer-config/finos-integration/virtual-machines/aws-virtual-machines.yml`
- `cfi-testing/privateer-config/finos-integration/serverless-computing/aws-serverless-computing.yml`
- `cfi-testing/privateer-config/finos-integration/vpc/aws-vpc-good.yml`
- `cfi-testing/privateer-config/finos-integration/vpc/aws-vpc-bad.yml`

## Azure

```bash
cd modules/integration-terraform/azure
terraform init
terraform apply -var='subscription_id=<sub-id>'
```

## GCP

```bash
cd modules/integration-terraform/gcp
terraform init
terraform apply -var='project_id=<project-id>'
```
