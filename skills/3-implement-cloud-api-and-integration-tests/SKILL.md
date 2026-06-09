---
name: implement-cloud-api-and-integration-tests
description: >-
  Implement cloud-api on AWS, Azure, and GCP from an approved Service interface,
  register the factory, and add integration_calls.csv rows to exercise every
  method. Run after write-cloud-api-interface-and-features; before
  build-integration-fixtures-and-cfi (terraform and privateer).
disable-model-invocation: true
---

# Implement cloud-api and integration tests

Implement the **approved** [`Service` interface](../2-write-cloud-api-interface/SKILL.md) on all clouds and wire **reflection integration tests** via `integration_calls.csv`.

Terraform, privateer YAML, and CFI configs are **skill 4** — CSV rows may reference `config:key` vars that skill 4 populates from fixtures.

## Purpose

| This skill **is** for | This skill **is not** for |
|------------------------|---------------------------|
| `aws-*.go`, `azure-*.go`, `gcp-*.go` implementations | Changing the `Service` interface (return to skill 2) |
| Factory + `ServiceTypes` registration | Terraform apply or CFI YAML |
| `integration_calls.csv` rows for every method | Expecting all CSV rows to pass without fixtures |
| `go build ./...` in `modules/cloud-api` | Gherkin feature changes |

**Success criterion:** `go build ./...` passes; every `Service` method has a CSV row; running `./run-integration-tests.sh` **may fail** until skill 4 applies terraform — that is expected.

Integration tests **exercise Go code**, not full behavioural compliance.

## Prerequisites

1. Skill 2 complete — interface + features **approved**.
2. Read `analysis.md` — **Cross-cloud implementation**, **Integration test coverage**.

## Outputs

| Artifact | Location |
|----------|----------|
| Cloud implementations | `modules/cloud-api/<package>/aws-*.go`, `azure-*.go`, `gcp-*.go` |
| Factory registration | `modules/cloud-api/factory/{aws,azure,gcp}_factory.go` |
| Service type registry (if new) | `modules/cloud-api/types/test.go` |
| Integration CSV | `modules/cloud-api-test/integration_calls.csv` |

Do **not** create in this skill:

- `modules/cloud-api-test/terraform/` (skill 4)
- `privateer-config/` or `cfi-testing/` (skill 4)
- New `.feature` files (skill 2)

---

## Workflow

```
Implementation + CSV progress:
- [ ] Step 0: Extract cross-cloud matrix + CSV rows from analysis.md
- [ ] Step 1: AWS, Azure, GCP implementations
- [ ] Step 2: Factory + ServiceTypes
- [ ] Step 3: integration_calls.csv
- [ ] Step 4: go build — document config keys CSV will need (for skill 4)
- [ ] Step 5: Review checklist
```

### Step 1: Cloud implementations

Mirror [`object-storage`](../../modules/cloud-api/object-storage/), [`gen-ai`](../../modules/cloud-api/gen-ai/):

**Rules:**

1. Implement `generic.Service` embed methods from analysis.
2. Implement every method on the approved `Service` interface.
3. Config via `types.Config` — no discovery of sinks or account names.
4. `GetOrProvisionTestableResources`: logical fixture ids from config; filter by `resource` when set.
5. **Honest errors** when a cloud lacks a fixture — use `expect_error=true` in CSV.
6. No mocks; coverage via `modules/cloud-api-test`.

### Step 2: Factory

Register `case "<factory-service-id>":` in `GetServiceAPI` and `GetServiceAPIWithIdentity` on all three factories. Append to `types.ServiceTypes` if new.

### Step 3: integration_calls.csv

One row per method (plus `logging` if planned):

```csv
api,method,cloud,expect_error,arg1,arg2,arg3,arg4
gen-ai,SubmitPrompt,aws,,finos-ccc-integration-genai-endpoint,config:benign-probe-prompt,
```

| Column | Meaning |
|--------|---------|
| `api` | Factory service id |
| `cloud` | `all` or `aws` / `azure` / `gcp` |
| `expect_error` | `true` for intentional error paths |
| `arg1`…`arg4` | Literals or `config:key` — skill 4 adds vars to privateer YAML |

Document required **config keys** in a short comment block at the top of the CSV section or in the PR for skill 4.

### Step 4: Build

```bash
cd modules/cloud-api && go build ./...
cd modules/runner && go build ./...
```

Do not apply terraform in this skill unless the user explicitly asks.

---

## Review checklist

- [ ] Interface unchanged from skill 2 approval (or changes re-reviewed)
- [ ] AWS / Azure / GCP implementations exist
- [ ] Factory registers service on all clouds
- [ ] CSV row per `Service` method (+ logging if planned)
- [ ] Config keys for CSV documented for skill 4
- [ ] **No** terraform or `cfi-testing/` in this change set

---