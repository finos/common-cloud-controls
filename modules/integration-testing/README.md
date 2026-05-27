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
export RUN_CLOUD_API_INTEGRATION=1
export INTEGRATION_PROVIDER=aws   # required: aws | azure | gcp

cd modules/integration-testing
go test -tags=integration -timeout=45m \
  -coverpkg=../cloud-api/... \
  -covermode=atomic \
  -coverprofile=coverage-integration.out \
  ./...
```

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
