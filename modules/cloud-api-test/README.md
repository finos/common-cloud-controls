# Cloud API integration tests

Live integration tests for `modules/cloud-api`. They assume integration terraform has already been applied and fixtures are running in the target cloud account.

## What it does

1. Loads minimal Privateer config for the active cloud: `privateer-config/{aws,azure,gcp}.yml` (only keys required by the CSV + cloud-api implementations).
2. Reads `integration_calls.csv` — `api` (factory service id), `method`, `cloud` (`aws`|`azure`|`gcp`|`all`), `expect_error`, and literal `arg1`…`arg4`. Rows whose `cloud` does not match `INTEGRATION_PROVIDER` are skipped.
3. Invokes each matching CSV row via reflection. A row with `expect_error=true` passes when the method returns an error. Any other failing row fails the test run (non-zero exit). `DeleteObject` and `DeleteBucket` run for `object-storage` only (paired after create rows in the CSV); other `Delete*` methods are skipped.
4. Calls `factory.TearDown()` once at the end of the run.
5. Emits Go coverage for `modules/cloud-api` when run with `-coverpkg`.

## CSV format

```csv
api,method,cloud,expect_error,arg1,arg2,arg3,arg4
serverless-computing,TriggerDataWrite,all,,finos-ccc-integration-fn-main,,
virtual-machines,UpdateResourcePolicy,aws,true,,,
logging,QueryLogs,all,,finos-ccc-integration-fn-main,admin,60,
```

- `cloud`: `all` runs on every provider; otherwise only that cloud.
- `expect_error`: `true` when the call is expected to fail (missing fixture, optional API, etc.).

## Run locally

```bash
cd modules/cloud-api-test
./run-integration-tests.sh aws    # or azure | gcp | all
```

The script sets `INTEGRATION_PROVIDER`, sources `environment-config/azure-env.sh` or `gcp-env.sh` when present, runs `go test -tags=integration` with coverage, writes `integration-results-<cloud>.txt`, and generates `coverage-integration-<cloud>.html`.

`./run-integration-tests.sh all` runs aws, then azure, then gcp (continues on failure), writes per-cloud artifacts as above, and merges coverage into `coverage-integration-all.out` / `.html` via [`gocovmerge`](https://github.com/wadey/gocovmerge) (`go run` on first use).

Manual equivalent:

```bash
export INTEGRATION_PROVIDER=aws   # required: aws | azure | gcp

cd modules/cloud-api-test
go test -tags=integration -timeout=45m \
  -coverpkg=../cloud-api/... \
  -covermode=atomic \
  -coverprofile=coverage-integration.out \
  ./...
```

Each CSV row prints `PASS` or `FAIL` to the console when the test finishes (and live with `-v`). `INTEGRATION_PROVIDER` must be set or the test exits immediately. If any row fails, `go test` exits with code 1.

Coverage uses `-coverpkg=../cloud-api/...` (entire module, including `generic/login`). An AWS-only run shows a low overall percentage until Azure/GCP jobs run; packages not hit by the CSV (e.g. `generic/login`) appear at 0% in `coverage-integration-*.html` as work to address (see this README, W-46).

Unit checks:

```bash
go test ./...
```

## After re-provisioning terraform

VPC names in `integration_calls.csv` and `privateer-config/*.yml` match the integration terraform VNet/VPC `name` values (for example `finos-ccc-integration-vpc`, `finos-ccc-integration-vpc-bad`, `finos-ccc-integration-vpc-cn03-allow-01`). Update those files if you rename resources in terraform.

## GitHub Actions

Workflow: `.github/workflows/cloud-api-integration.yml`. Runs `./run-integration-tests.sh all` (aws → azure → gcp) and uploads merged `coverage-integration-all.out` to Codecov.

## Terraform

Provision fixtures first — see `modules/cloud-api-test/terraform/`.

Ideally, the terraform here should be just enough to allow us to integration test the `cloud-cfi` module.  **NOTE**:  it should be the cheapest, most minimal installation possible.  

When adding extra terraform, please take this into account.

## User Creation

Behavioural/integration tests use cloud test identities (no-access, write, admin; Azure also has read). Regenerate env files with idempotent scripts in `modules/cloud-api-test/environment-config/`:

```bash
cd modules/cloud-api-test/environment-config
./provision-aws.sh    # or provision-azure.sh / provision-gcp.sh
source ./aws-env.sh   # matching *-env.sh for your cloud
```

Re-run the same `provision-<cloud>.sh` after `terraform apply` to refresh fixture vars (`STALE_VERSION_ID`, hostnames, …) without creating new users. `STALE_VERSION_ID` must be present in `*-env.sh` (AWS value comes from local terraform when you provision). CI copies env files into `AZURE_ENV` / `GCP_ENV` / `AWS_ENV` secrets.

### GitHub Actions secret model

For CI, store each generated env file as a single multiline secret:
- `AZURE_ENV` (contents of `azure-env.sh`)
- `GCP_ENV` (contents of `gcp-env.sh`)
- `AWS_ENV` (if you maintain an AWS env script)

Core platform values can still come from existing repo secrets (for example `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `GCP_PROJECT_ID`, `GCP_PROJECT_NUMBER`, `AWS_REGION`).

