# Cloud API integration tests

Live calls against **`modules/cloud-api`** in a real AWS / Azure / GCP account.

## Purpose

These tests answer: **does our Go cloud-api code work against the live providers, and how much of that package do we cover?**

They are **not**:

- Control-catalog / assessment-requirement (AR) pass/fail
- Proof that a cluster or account is “compliant”
- Exhaustive scenario matrices over fixture manifests
- Coverage of upstream SDKs or `client-go` itself

Behavioural Godog features under `modules/features/` own AR intent. This package owns **factory wiring + method execution + coverage** for code we maintain.

Prefer CSV rows that hit **distinct branches in our implementations**. Extra rows that only change fixture YAML (same method path) do not meaningfully increase Go coverage.

## Prerequisites

1. Integration terraform applied (`modules/cloud-api-test/terraform/<aws|azure|gcp>/`) — cheapest fixtures that still exercise the APIs under test.
2. Cloud credentials / env (see [User creation](#user-creation) and CI secrets below).
3. For VM / Kubernetes: compute fixtures started (`scale-fixtures.sh start`) so billable resources are online before the CSV run.

## What a run does

1. Loads `privateer-config/{aws,azure,gcp}.yml` (minimal vars for CSV + cloud-api).
2. Reads `integration_calls.csv`: `api` (factory service id), `method`, `cloud` (`aws`|`azure`|`gcp`|`all`), `expect_error`, `arg1`…`arg5`.
3. Skips rows whose `cloud` does not match `INTEGRATION_PROVIDER`.
4. Resolves each `api` via `factory.GetServiceAPI` and invokes `method` by reflection.
5. `expect_error=true` → pass only if the call returns an error; otherwise pass only if it succeeds.
6. `DeleteObject` / `DeleteBucket` run for `object-storage` only; other `Delete*` methods are skipped.
7. Calls `factory.TearDown()` once at the end.
8. Writes per-provider results and Go coverage over `modules/cloud-api/...`.

### Kubernetes note

Factory id `kubernetes` is the **ControlPlane** (CSP + admit + governance/auth/encryption/inventory helpers). Portable `KubeClient` probes obtained via `GetKubernetesClient` (RBAC listings, NetworkPolicy Jobs, etc.) are exercised from behavioural features as `kubeClient`, not duplicated as AR matrices in this CSV. One `GetKubernetesClient` row may appear as a smoke that CSP-derived REST config wiring works (`kubernetes-cluster-name` + ambient cloud credentials).

## CSV format

```csv
api,method,cloud,expect_error,arg1,arg2,arg3,arg4,arg5
serverless-computing,TriggerDataWrite,all,,finos-ccc-integration-fn-main,,,
virtual-machines,UpdateResourcePolicy,aws,true,,,,,
logging,QueryLogs,all,,finos-ccc-integration-fn-main,admin,60,,
```

- `cloud`: `all` runs on every provider; otherwise only that cloud.
- `expect_error`: `true` when the call is expected to return an error (denied path, unsupported stub, etc.).
- `arg5`: used for methods with five parameters (comma-separated values may coerce to `[]int` / `[]string`).

Args may use `config:<var>` to pull a Privateer config value (for example a manifest string).

## Run locally

```bash
cd modules/cloud-api-test

# Optional: bring VM / AKS|EKS|GKE fixtures online first
./scale-fixtures.sh start \
  -c "privateer-config/aws.yml" -S integration -s virtual-machines,kubernetes

./run-integration-tests.sh aws    # or azure | gcp | all

./scale-fixtures.sh stop -p aws -s virtual-machines,kubernetes
```
The script sets `INTEGRATION_PROVIDER`, sources `environment-config/<cloud>-env.sh` when present, runs `go test -tags=integration` with coverage, writes `integration-results-<cloud>.txt`, and generates `coverage-integration-<cloud>.html`.

`./run-integration-tests.sh all` runs aws → azure → gcp (continues on failure) and merges coverage into `coverage-integration-all.out` / `.html`.

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

Each CSV row prints `PASS` or `FAIL`. `INTEGRATION_PROVIDER` must be set or the test exits immediately. Any failed row makes `go test` exit 1.

Coverage uses `-coverpkg=../cloud-api/...`. A single-cloud run under-reports packages that only exist on other clouds; merge or run the matrix for a fuller picture. Packages never referenced by the CSV (for example some `generic/login` paths) stay at 0% until rows or unit tests cover them.

Unit checks (no cloud):

```bash
go test ./...
```

## After re-provisioning terraform

Names in `integration_calls.csv` and `privateer-config/*.yml` must match terraform resource names (for example `finos-ccc-integration-vpc`, `finos-ccc-integration-k8s-main`). Update those files if you rename fixtures.

## GitHub Actions

Workflow: `.github/workflows/cloud-api-integration.yml`.

- Matrix: `aws` | `azure` | `gcp` (one job per provider).
- Starts VM/Kubernetes fixtures, runs `./run-integration-tests.sh $PROVIDER`, then stops fixtures (`if: always()`).
- Kubernetes kube clients are derived inside `cloud-api` from `kubernetes-cluster-name` + ambient cloud credentials (no CI kubeconfig bootstrap).
- Uploads per-provider results/coverage artifacts and Codecov.

## Terraform

Provision fixtures under `modules/cloud-api-test/terraform/` before running.

Keep this stack **minimal and cheap**: only what is required to exercise `modules/cloud-api`. Prefer start/stop (or scale-to-zero) for billable compute between runs.

## User creation

Tests use cloud test identities (no-access, write, admin; Azure also has read). Regenerate env files with idempotent scripts:

```bash
cd modules/cloud-api-test/environment-config
./provision-aws.sh    # or provision-azure.sh / provision-gcp.sh
source ./aws-env.sh   # matching *-env.sh for your cloud
```

Re-run the same `provision-<cloud>.sh` after `terraform apply` to refresh fixture vars (`STALE_VERSION_ID`, hostnames, …) without creating new users. CI stores env file contents in `AZURE_ENV` / `GCP_ENV` / `AWS_ENV` secrets.

Core platform values can still come from existing repo secrets (for example `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `GCP_PROJECT_ID`, `GCP_PROJECT_NUMBER`, `AWS_REGION`).
