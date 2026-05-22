# CCC behavioural compliance tests

Godog runner for scenarios under `modules/features/`.

## Prerequisites

- Go 1.24+
- Privateer (pvtr)
- Cloud credentials for the target provider (AWS CLI, `az login`, or GCP ADC)
- For Azure behavioural tests: provision infra and test principals, then source credentials.

# In common-cloud-controls (this repo)
export INSTANCE_ID   # same value as above
./cfi-testing/run-compliance-tests.sh -i cfi_test_${INSTANCE_ID}

## Run

From this directory (`cfi-testing/`), after sourcing Azure credentials (see Prerequisites):

```bash
source ../ccc-cfi-compliance/remote/azure/storageaccount/azure-env.sh   # or repo-root azure-env.sh
export INSTANCE_ID=20260408t161043z
./run-compliance-tests.sh -i cfi_test_${INSTANCE_ID} -g '@Behavioural'
```

This runs **Privateer** (`pvtr run`) → **ccc-behavioural-plugin** → Godog scenarios under `modules/features/`.

From the repository root:

```bash
./cfi-testing/run-compliance-tests.sh -i cfi_test_<suffix> -g '@Behavioural'
```
