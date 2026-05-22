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

## Layout

| Piece | Path |
|--------|------|
| Config | `config/` (e.g. `azure-storage-finos.yaml`) |
| Run script | `run-compliance-tests.sh` (builds `ccc-compliance` from `runner`, runs it here) |
| Runner library + CLI source | [`../runner`](../runner) |

Use `./run-compliance-tests.sh` (recommended), or build the CLI yourself:

```bash
export GOWORK=../go.work
cd ../runner && go build -o ../cfi-testing/ccc-compliance ./cmd/ccc-compliance/
```

### Privateer behavioural plugin

Run the same tests via [privateer-plugin](../privateer-plugin):

```bash
cd modules/privateer-plugin
go build -o privateer-plugin .
./privateer-plugin debug \
  -c ../cfi-testing/config/privateer-behavioural-azure.example.yml \
  -s azureStorageBehavioural
```

Or `privateer run -c ...` after installing the plugin to `~/privateer/bin`.
