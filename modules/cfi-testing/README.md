# CCC behavioural compliance tests

Godog runner for `@Behavioural` scenarios under `modules/features/`.

## Prerequisites

- Go 1.24+
- Cloud credentials for the target provider (AWS CLI, `az login`, or GCP ADC)
- For Azure: set `INSTANCE_ID` when using `environment.yaml` placeholders (e.g. `export INSTANCE_ID=dev1`)

## Run

From the repository root:

```bash
./modules/cfi-testing/run-compliance-tests.sh --env-file config/azure-storage-finos.yaml --instance main-azure --service object-storage
```

### Useful flags

| Flag | Description |
|------|-------------|
| `-instance` | Instance id from `environment.yaml` (required) |
| `-service` | Service type (`object-storage`, `vpc`, …) |
| `-tags` | Extra tag filters ANDed with defaults, e.g. `@Behavioural` |
| `-resource` | Run a single discovered resource by name |
| `-output` | Report directory (default: `modules/cfi-testing/output`) |
| `-env-file` | Alternate `environment.yaml` path |

By default, `@NEGATIVE` and `@OPT_IN` scenarios are excluded. Pass `-tags '@Behavioural'` to narrow explicitly.

### Examples

```bash
# All services defined for the instance
./modules/cfi-testing/run-compliance-tests.sh --instance main-aws

# Azure storage (FINOS config + resource group shorthand)
./modules/cfi-testing/run-compliance-tests.sh \
  -e config/azure-storage-finos.yaml -i cfi_test_20260408t161043z

# VPC behavioural tests
./modules/cfi-testing/run-compliance-tests.sh --instance main-aws --service vpc --tags '@Behavioural'
```

## Go modules

| Module | Path |
|--------|------|
| `cfi-testing` | This directory — runner, env config |
| `cloud-testing-dsl` | [`../cloud-testing-dsl`](../cloud-testing-dsl) — Cucumber cloud steps |
| `reporters` | [`../reporters`](../reporters) — HTML / OCSF formatters |
| `cloud-api` | [`../cloud-api`](../cloud-api) — provider APIs |

Build from this directory (uses `modules/go.work`):

```bash
export GOWORK=../go.work
go build -o ccc-compliance ./runner/
```

Or use `./run-compliance-tests.sh`, which builds the whole workspace first.
