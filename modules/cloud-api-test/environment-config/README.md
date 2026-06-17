# Environment config

Cloud-specific env files (`*-env.sh`) and idempotent provision scripts for integration and behavioural tests.

## Layout

```
environment-config/
  lib.sh              # shared helpers
  provision-aws.sh
  provision-azure.sh
  provision-gcp.sh
  aws-env.sh          # gitignored — generated
  azure-env.sh
  gcp-env.sh
  .keys/              # gitignored — local credentials
```

## Workflow

1. Apply fixtures: `../terraform/<cloud>/`
2. Regenerate env (safe to re-run; reuses existing users/SAs/apps):

```bash
cd modules/cloud-api-test/environment-config
./provision-aws.sh    # or provision-azure.sh / provision-gcp.sh
source ./aws-env.sh   # matching cloud
```

3. Run tests: `../run-integration-tests.sh <aws|azure|gcp>`

## Idempotency

- **Users / SAs / Entra apps**: created only if missing; same `INSTANCE_ID` cohort is reused by reading existing `*-env.sh` when present.
- **Keys / Azure client secrets**: reused from `.keys/` or `*-env.sh` unless `ROTATE_KEYS=1` (AWS/GCP) or `ROTATE_SECRETS=1` (Azure).
- **Fixture vars** (`STALE_VERSION_ID`, `AZURE_VM_HOSTNAME`, …): refreshed on each provision run (AWS `STALE_VERSION_ID` from local terraform state when generating `aws-env.sh`).

Set `INSTANCE_ID=<suffix>` only when intentionally creating a new identity cohort (`cfi-<suffix>-…`).

## CI

GitHub Actions writes multiline `AWS_ENV` / `AZURE_ENV` / `GCP_ENV` into `environment-config/*-env.sh` before tests (no terraform state in CI).

**Azure Key Vault (secrets):** Integration uses `DefaultAzureCredential` (in GHA that is the `AZURE_CLIENT_ID` service principal). Grant it vault access in Terraform, not in the workflow: set `integration_runner_client_id` in `terraform/azure/terraform.tfvars` to the same app id as `AZURE_CLIENT_ID`, then `terraform apply` in `terraform/azure`.
