# CCC behavioural compliance tests

Godog runner for scenarios under `modules/features/`.

## Prerequisites

- Go 1.24+
- Privateer (pvtr)
- Cloud credentials for the target provider (AWS CLI, `az login`, or GCP ADC)
- For Azure behavioural tests: source credentials from `azure-env.sh` (see repo root or terraform provision script)

## Run

From this directory (`cfi-testing/`), after sourcing Azure credentials:

```bash
source ../azure-env.sh
./run-compliance-tests.sh -g '@Behavioural'
```

AWS VPC example:

```bash
./run-compliance-tests.sh \
  -c privateer-config/aws-vpc-good.yml \
  -S awsVpcGood \
  -s vpc \
  -g '@Behavioural'
```

This runs **Privateer** (`pvtr run`) → **ccc-behavioural-plugin** → Godog scenarios under `modules/features/`.

Privateer config YAML holds **explicit resource names** (matching terraform outputs). Use `${AZURE_*}` / `${AWS_*}` env vars only for credentials and subscription/project ids — not `${INSTANCE_ID}`.

From the repository root:

```bash
./cfi-testing/run-compliance-tests.sh -g '@Behavioural'
```
