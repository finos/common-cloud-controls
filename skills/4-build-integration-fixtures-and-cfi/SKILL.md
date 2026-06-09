---
name: build-integration-fixtures-and-cfi
description: >-
  Build minimal integration terraform, privateer configs (integration +
  finos-integration), CFI actions-config, and provision scripts so
  integration_calls.csv and behavioural features can run against real fixtures.
  Run after implement-cloud-api-and-integration-tests.
disable-model-invocation: true
---

# Build integration fixtures and CFI configs

Wire **infrastructure and Privateer** so skill 3's `integration_calls.csv` and skill 2's feature files can **execute** against cloud resources.

## Purpose

| This skill **is** for | This skill **is not** for |
|------------------------|---------------------------|
| Minimal terraform under `modules/cloud-api-test/terraform/` | Redesigning `Service` or features |
| `privateer-config/{aws,azure,gcp}.yml` (integration) | Full production compliance |
| `cfi-testing/privateer-config/finos-integration/<service>/` | Expecting all behavioural scenarios to pass |
| `cfi-testing/actions-config/*-finos.yaml` | Duplicating cloud-api implementations |
| `provision-*.sh` env from terraform outputs | |

**Success criterion:**

- `./run-integration-tests.sh <cloud>` — CSV rows **invoke** each method (`expect_error=true` is PASS when intentional).
- `./cfi-testing/run-compliance-tests.sh` — Godog runs; many `@MAIN` failures are **expected** until fixtures grow (demonstrates gap vs catalog).

Terraform exists to **exercise cloud-api**, not to pass every behavioural test on first apply.

## Prerequisites

1. Skill 3 complete — `modules/cloud-api/<package>/` builds; `integration_calls.csv` exists.
2. Read `analysis.md` — **Terraform fixtures (planned)**, **Privateer config**, **CI actions-config**.

## Outputs

| Artifact | Location |
|----------|----------|
| Integration terraform | `modules/cloud-api-test/terraform/<aws\|azure\|gcp>/modules/<service>/` |
| Integration privateer vars | `modules/cloud-api-test/privateer-config/{aws,azure,gcp}.yml` |
| Behavioural privateer configs | `cfi-testing/privateer-config/finos-integration/<service>/` |
| CI action wiring | `cfi-testing/actions-config/<provider>-<service>-finos.yaml` |
| Provision script updates | `modules/cloud-api-test/environment-config/provision-*.sh` |

---

## Workflow

```
Fixtures + CFI progress:
- [ ] Step 0: Extract fixtures + privateer vars from analysis.md + CSV config keys
- [ ] Step 1: Terraform submodules (minimal, per cloud)
- [ ] Step 2: Integration privateer-config + provision scripts
- [ ] Step 3: finos-integration YAML + actions-config
- [ ] Step 4: terraform apply + provision + run integration + behavioural smoke
- [ ] Step 5: Review checklist
```

### Step 1: Integration terraform

Under `modules/cloud-api-test/terraform/<cloud>/`:

1. Add `modules/<service>/` (one main testable resource per service type; **`vpc`** exception).
2. Wire root `main.tf` + `outputs.tf`.

**Principles:** modular, `finos-ccc-integration-*` naming, minimal cost, locals-only stubs OK when config-driven code paths still run. See [`modules/cloud-api-test/README.md`](../../modules/cloud-api-test/README.md).

### Step 2: Integration privateer + provision

Update [`privateer-config/{aws,azure,gcp}.yml`](../../modules/cloud-api-test/privateer-config/aws.yml) with vars CSV rows need.

Map terraform outputs → env in **`provision-*.sh`** only (e.g. `GENAI_GUARDRAIL_ID`, `AZURE_OPENAI_ENDPOINT`) — not in `run-integration-tests.sh`.

### Step 3: finos-integration + actions-config

Per cloud under `cfi-testing/privateer-config/finos-integration/<service>/`:

- Hard-code resource names from terraform outputs (comment source `terraform output`)
- `${AWS_*}` / `${AZURE_*}` / `${GCP_*}` for credentials only
- `plugin: ccc-behavioural-plugin`, `tags`, `catalog-locations`, vars features reference

Add `cfi-testing/actions-config/<provider>-<service>-finos.yaml` — `path` → `modules/cloud-api-test/terraform/<cloud>`.

### Step 4: Verify

```bash
cd modules/cloud-api-test/terraform/<cloud> && terraform apply -target=module.<service>
cd ../../environment-config && ./provision-<cloud>.sh && source ./<cloud>-env.sh
cd .. && ./run-integration-tests.sh <cloud>

export GOWORK=modules/go.work
./cfi-testing/run-compliance-tests.sh \
  -c cfi-testing/privateer-config/finos-integration/<service>/aws-<service>.yml \
  -S aws<Service> -s <factory-id> -g '@Behavioural'
```

Document honest failures — do not weaken scenarios to force green.

---

## Three layers

| Layer | Skill | Pass means |
|-------|-------|------------|
| Interface + features | [write-cloud-api-interface-and-features](../2-write-cloud-api-interface/SKILL.md) | API + scenarios reviewed |
| Code + CSV | [implement-cloud-api-and-integration-tests](../3-implement-cloud-api-and-integration-tests/SKILL.md) | Method invoked via CSV |
| Fixtures + CFI | **This skill** | Integration runs; behavioural executes (pass or fail) |

---

## Review checklist

- [ ] Terraform submodule per cloud; outputs stable
- [ ] `privateer-config/*.yml` matches CSV `config:` keys and terraform outputs
- [ ] `provision-*.sh` exports tfstate-derived vars
- [ ] finos-integration YAML per cloud; actions-config entries
- [ ] Integration tests run; behavioural smoke completes without panic
- [ ] Failures documented where fixtures are insufficient

---
