# ccc-behavioural-plugin

Privateer **evaluation** plugin that runs CCC **behavioural** Godog scenarios via [runner](../runner).

**Reference catalog:** resolved from `catalog-versions` in Privateer config (DEV → `website/src/data/ccc-releases`; published releases → local when present, download TBD). Override search dir with `CCC_CATALOG_RELEASES_DIR`.

Configuration comes from **Privateer** `services.<id>.vars` only (no separate `environment.yaml`).

## Config

See [azure-cloud-storage.yml](../../cfi-testing/privateer-config/finos-integration/cloud-storage/azure-cloud-storage.yml) and [aws-vpc-good.yml](../../cfi-testing/privateer-config/finos-integration/vpc/aws-vpc-good.yml).

Required `services.<name>.vars`:

| Var | Description |
|-----|-------------|
| `service` | Godog service type (e.g. `object-storage`) |
| `provider` | Cloud provider (`azure`, `aws`, `gcp`) |
| `resource` | Resource name filter (container name, VPC name tag, etc.) |
| `tags` | Optional Cucumber tag filter (e.g. `@Behavioural`) |
| `test-identities` | Pre-provisioned principals |

Resource names (storage account, resource group, VPC ids, log sink names) are **hard-coded in YAML** to match terraform outputs. Credential env vars (`AZURE_TEST_USER_*`, `AZURE_SUBSCRIPTION_ID`, …) are expanded at runtime via `ExpandVars`.

## Run

Recommended — from `cfi-testing/` (builds plugin, installs to `.privateer/bin`, runs `pvtr`):

```bash
source ../azure-env.sh
./run-compliance-tests.sh -g '@Behavioural'
```
