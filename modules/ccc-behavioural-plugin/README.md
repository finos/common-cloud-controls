# ccc-behavioural-plugin

Privateer **evaluation** plugin that runs CCC **behavioural** Godog scenarios via [runner](../runner).

Uses the standard Privateer [`EvaluationOrchestrator`](https://github.com/privateerproj/privateer-sdk) pattern (`Mobilize` → Gemara evaluation log → `WriteResults`). The full Godog suite runs once via `runner.Run`; [`reporters`](../reporters) `PrivateerFormatter` collects per-scenario results and each catalog AR step maps them to Gemara outcomes (e.g. `CCC.Core.CN05.AR01` from matching Godog scenarios).

**Reference catalog:** `website/src/data/ccc-releases/` (e.g. `CCC.ObjStor_v2025.09.yaml`). Override with `CCC_CATALOG_DIR`. Release download from GitHub will replace this path later.

Configuration comes from **Privateer** `services.<id>.vars` only (no separate `environment.yaml`).

## Config

See [azure-cloud-storage.yml](../../cfi-testing/privateer-config/azure-cloud-storage.yml).

Required `services.<name>.vars`:

| Var | Description |
|-----|-------------|
| `service` | Godog service type (e.g. `object-storage`) |
| `provider` | Cloud provider (`azure`, `aws`, `gcp`) |
| `instance-id` | Substituted as `${INSTANCE_ID}` in other vars |
| `tags` | Optional Cucumber tag filter (e.g. `@Behavioural`) |
| `test-identities` | Pre-provisioned principals |

## Run

Recommended — from `cfi-testing/` (builds plugin, installs to `.privateer/bin`, runs `pvtr`):

```bash
source ../../ccc-cfi-compliance/remote/azure/storageaccount/azure-env.sh
export INSTANCE_ID=...
./run-compliance-tests.sh -i cfi_test_${INSTANCE_ID} -g '@Behavioural'
```
