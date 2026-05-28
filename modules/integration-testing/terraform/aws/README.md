# AWS Integration Terraform

Creates AWS fixtures for:

- `object-storage`: one S3 bucket with object lock retention and baseline bucket policy.
- `virtual-machines`: one EC2 instance in a dedicated VPC/subnet with restricted SSH ingress.
- `serverless-computing`: one Lambda function with basic execution role.
- `vpc`: dedicated VPC fixtures for VPC control validation tests.
