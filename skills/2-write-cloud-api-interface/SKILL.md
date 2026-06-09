---
name: write-cloud-api-interface-and-features
description: >-
  Define the cloud-api Service interface (Go types + godoc only) and implement
  Gherkin feature files from an approved analysis.md. Review API and scenarios
  together before cloud implementations. Run after
  build-service-behavioural-test-analysis; before
  implement-cloud-api-and-integration-tests.
disable-model-invocation: true
---

# Write cloud-api interface and feature files

Turn an approved [`analysis.md`](../../modules/features/<service-folder>/analysis.md) into:

1. A **reviewable `Service` interface** in `modules/cloud-api/<package>/<service>.go` (signatures + result types + godoc — **no cloud SDK code yet**).
2. **Gherkin feature files** that call that interface from scenarios.

Stop for **API + scenario review** before implementing AWS/Azure/GCP or integration fixtures.

Next skill: [implement-cloud-api-and-integration-tests](../3-implement-cloud-api-and-integration-tests/SKILL.md).

## Purpose

| This skill **is** for | This skill **is not** for |
|------------------------|---------------------------|
| `Service` interface + shared types in one Go file | `aws-*.go` / `azure-*.go` / `gcp-*.go` implementations |
| Godoc describing cloud-agnostic semantics | Terraform, `integration_calls.csv`, CFI YAML |
| Feature files + generic tags + runner discovery | Factory registration (next skill) |
| Aligning scenarios with the interface | Making scenarios pass (fixtures come in skill 4) |

**Stop condition:** Interface and features are reviewable together. Features may not compile/run until skill 3 registers the factory and implements methods — that is expected.

## API design rules

The cloud-api package **abstracts the cloud provider**, not the behavioural test harness.

1. **Explicit parameters** — pass resource ids, prompts, filter text from features/config; no hidden probe profiles on invoke methods (e.g. `InvokeModel(prompt string)` with endpoint from config `resource`).
2. **Reuse** `generic.Service` and `logging.Service` — check [generic/service.go](../../modules/cloud-api/generic/service.go).
3. **Smallest interface** justified by `analysis.md` and the feature files you write.
4. **Typed structs** for stable returns; maps only when exploratory.
5. **Config keys** documented in godoc (`config.Get("kebab-key")`); no discovery in the interface contract.

`ApplyContentFilter` and similar **filter** methods take explicit text + direction; guardrail and endpoint ids come from config (`guardrail-id`, `resource`) when the fixture is singular — keep probe strings in privateer vars, not inside the service API.

### Output: interface file only

```
modules/cloud-api/<package>/
  <service>.go    # Service interface + result types — ONLY this file in this skill
```

Reference [`logging/logging.go`](../../modules/cloud-api/logging/logging.go) and [`gen-ai/gen-ai.go`](../../modules/cloud-api/gen-ai/gen-ai.go) for godoc style.

---

## Feature files

Follow [modules/features/README.md](../../modules/features/README.md).

### Reuse generic (default)

From **Feature reuse from generic** in analysis:

1. Tag existing files under `modules/features/generic/CCC.Core/` (or `vpc/`, `port/`) with `@<service>`.
2. Keep `{service-type}` placeholders — do not copy into `<service-folder>/CCC.Core/`.

### New service-specific features

One file per AR where analysis says **new**:

```
modules/features/<service-folder>/
  <CatalogId>/
    CCC-<Catalog>-CN01-AR01.feature
```

Naming: `CCC-<ControlFamily>-<AR>.feature`.

**Conventions:**

- `Given a cloud api for "{config}" in "api"`
- `GetServiceAPI` / `GetServiceAPIWithIdentity` — identity keys from `test-identities`; never `ProvisionUserWithAccess`
- Logging ARs: second service `logging`, then `QueryLogs`
- Steps: [standard-cucumber-steps](https://github.com/robmoffat/standard-cucumber-steps/blob/main/README.md)

**Tags:** `@Behavioural`, `@<service>`, `@MAIN`, `@SANITY`, `@OPT_IN`, `@NotTestable` per analysis disposition.

### Runner discovery

Update [`collectFeaturePaths`](../../modules/runner/BasicServiceRunner.go) and `modules/features/README.md` when the service needs `port/`, `vpc/`, or a new `@<service>` tag.

---

## Workflow

```
Interface + features progress:
- [ ] Step 0: Extract interface table + feature reuse from analysis.md
- [ ] Step 1: Write Service interface + types in <service>.go
- [ ] Step 2: Tag generic/ + create new .feature files
- [ ] Step 3: Runner + features README routing
- [ ] Step 4: Review checklist — stop for sign-off
```

### Step 0: Extract from analysis

| Analysis section | Task |
|------------------|------|
| Cloud-api interface | Methods, args, returns |
| generic.Service methods | Embed on `Service`; scenarios use generic steps |
| Feature reuse from generic | Tags vs new paths |
| Per-AR disposition | `@MAIN` vs `@NotTestable` vs `@OPT_IN` |

### Step 4: Stop for review

Present together:

1. Full `Service` interface (signatures + godoc + result types)
2. Feature file list mapped to AR ids
3. Placeholder vars scenarios need (probe prompts, `{kb-id}`, `{approved-source-id}`, etc.; endpoint and guardrail from config when singular)
4. Deviations from `analysis.md`

**Wait for approval** before [implement-cloud-api-and-integration-tests](../3-implement-cloud-api-and-integration-tests/SKILL.md).

---

## Review checklist

- [ ] Every analysis **Cloud-api interface** method on `Service`
- [ ] Only `<service>.go` in `modules/cloud-api/<package>/` (no `aws-*.go` yet)
- [ ] No test-harness concepts on the public API
- [ ] Every native AR has a feature or reuse/`@NotTestable` row
- [ ] Generic reuse = tags only; no duplicated Core files
- [ ] `modules/features/README.md` updated if new service tag
- [ ] **No** terraform, CSV, factory, or `cfi-testing/` in this change set

---
