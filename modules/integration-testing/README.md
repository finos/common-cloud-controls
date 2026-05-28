# Cloud API integration tests

Live integration tests for `modules/cloud-api`. They assume integration terraform has already been applied and fixtures are running in the target cloud account.

## What it does

1. Loads minimal Privateer config for the active cloud: `privateer-config/{aws,azure,gcp}.yml` (only keys required by the CSV + cloud-api implementations).
2. Reads `integration_calls.csv` — `api` (factory service id), `method`, and literal `arg1`…`arg4`.
3. Invokes every CSV row on the active provider via reflection (no skipping by cloud). `GetServiceAPI` and method errors—including unimplemented APIs—are logged as non-fatal; the run continues. (Delete currently skipped)
4. Calls `factory.TearDown()` once at the end of the run.
5. Emits Go coverage for `modules/cloud-api` when run with `-coverpkg`.

## CSV format

```csv
api,method,arg1,arg2,arg3,arg4
serverless-computing,TriggerDataWrite,finos-ccc-integration-fn-main,,,
logging,QueryLogs,finos-ccc-integration-fn-main,admin,60,
```

## Run locally

```bash
export INTEGRATION_PROVIDER=aws   # required: aws | azure | gcp

cd modules/integration-testing
go test -tags=integration -timeout=45m \
  -coverpkg=../cloud-api/... \
  -covermode=atomic \
  -coverprofile=coverage-integration.out \
  ./...
```

Each CSV row prints `PASS` or `FAIL` to the console when the test finishes (and live with `-v`). `INTEGRATION_PROVIDER` must be set or the test exits immediately.

Unit checks:

```bash
go test ./...
```

## After re-provisioning terraform

Update `privateer-config/aws.yml` and VPC literals in `integration_calls.csv` to match `terraform output`.

## GitHub Actions

Workflow: `.github/workflows/cloud-api-integration.yml`. Sets `INTEGRATION_PROVIDER` per job.

## Terraform

Provision fixtures first — see `modules/integration-testing/terraform/`.

Ideally, the terraform here should be just enough to allow us to integration test the `cloud-cfi` module.  **NOTE**:  it should be the cheapest, most minimal installation possible.  

When adding extra terraform, please take this into account.

## User Creation

Behavioural/integration tests use cloud test identities (no-access, write, admin; Azure also has read). Provision them with scripts in `modules/integration-testing/user-creation/`. e.g: 
```bash
cd modules/integration-testing/user-creation
./provision-azure-test-users.sh
source ./azure-env.sh
```

### GitHub Actions secret model

For CI, store each generated env file as a single multiline secret:
- `AZURE_ENV` (contents of `azure-env.sh`)
- `GCP_ENV` (contents of `gcp-env.sh`)
- `AWS_ENV` (if you maintain an AWS env script)

Core platform values can still come from existing repo secrets (for example `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `GCP_PROJECT_ID`, `GCP_PROJECT_NUMBER`, `AWS_REGION`).

