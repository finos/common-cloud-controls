---
name: build-service-behavioural-test-analysis
description: >-
  Analyse a CCC service control catalog and produce analysis.md plus a minimal
  cloud-api interface design for behavioural tests. Use when ingesting
  catalogs/*/*/controls.yaml, creating modules/features folders, or planning
  @Behavioural Gherkin scenarios before implementation. Downstream implementation
  uses modules/cloud-api-test (terraform, integration_calls.csv) and
  cfi-testing/privateer-config/finos-integration.
disable-model-invocation: true
---

# Build service behavioural test analysis

Produce **`analysis.md`** and a **minimal `cloud-api` interface sketch** before writing feature files or Go implementations. Implementation is covered by [build-features-and-cloud-api](../build-features-and-cloud-api/SKILL.md).

## When to use

- A new or updated `catalogs/<category>/<service>/controls.yaml` needs behavioural test coverage.
- You are asked to plan how to test assessment requirements (ARs) on AWS, Azure, and GCP.
- You need to decide which methods belong on the service interface vs `logging.Service` vs `generic.Service`.

## Outputs

| Output | Location |
|--------|----------|
| Analysis document | `modules/features/<service-folder>/analysis.md` |
| Interface sketch (in analysis only — no Go yet) | Section inside `analysis.md` |

**Create only `analysis.md`.** Do not create catalog subdirectories, `.feature` files, Go code, terraform, privateer YAML, `integration_calls.csv`, or `actions-config` in this skill unless the user explicitly asks.

Do **not** create:

- Placeholder `README.md` files under `<CatalogId>/` or `CCC.Core/` (e.g. `CCC.VM/README.md`)
- Empty catalog subdirectories “for later”
- `.gitkeep` or other scaffold files
- Updates to `modules/features/README.md` routing rules (that belongs in the implementation skill)

The analysis document describes the planned feature tree, terraform fixture roles, and config vars; physical artifacts are created in the implementation skill.

Do **not** create `.feature` files or implement Go in this skill unless the user explicitly asks to continue to implementation.

---

## Workflow

Copy and track progress:

```text
Analysis progress:
- [ ] Step 1: Ingest catalog + metadata
- [ ] Step 2: Inventory generic/ + plan layout (reuse table + new-only paths)
- [ ] Step 3: Classify every AR (testable / not / inherited / reuse generic)
- [ ] Step 4: Draft per-AR test approach
- [ ] Step 5: Design minimal cloud-api interface(s)
- [ ] Step 6: Cross-cloud implementation notes (AWS / Azure / GCP)
- [ ] Step 7: Plan fixtures, config vars, and integration CSV rows
- [ ] Step 8: Write analysis.md
- [ ] Step 9: Review — interface count, AR coverage, gaps
```

### Step 1: Ingest the control catalog

Read **both**:

1. `catalogs/<path>/controls.yaml` — controls, ARs, imported-controls
2. `catalogs/<path>/metadata.yaml` — catalog `id` (e.g. `CCC.VPC`, `CCC.SecMgmt`), CSP service names, docs URLs

From `controls.yaml` extract for each AR:

| Field | Source |
| ------- | -------- |
| AR id | `assessment-requirements[].id` |
| Requirement text | `assessment-requirements[].text` |
| Applicability | `assessment-requirements[].applicability` (TLP tags) |
| Parent control | `controls[].id`, `title`, `objective` |

From `imported-controls` list **inherited** CCC.Core (or other) ARs that apply to this service but are defined elsewhere.

**Reuse `modules/features/generic/` first.** That folder holds shared `@PerService` and `@PerPort` Core scenarios (CN01, CN03, CN04, CN05, CN07, CN10, …) that already use `{service-type}` or port probes. For a new service, the default plan is to **add a service tag** (e.g. `@virtual-machines`) to existing generic scenarios — not to copy feature files into `<service-folder>/CCC.Core/`. Only plan **new** feature files when generic steps cannot express the AR (service-specific cloud-api methods, probes that differ from `@PerPort` patterns). See [`modules/features/virtual-machines/analysis.md`](../../modules/features/virtual-machines/analysis.md) for a reuse table example.

**Parse the AR sentence.** Most ARs follow:

> **When** \<trigger condition\>, the service **MUST** \<expected behaviour\>.

Map to test shape:

| AR pattern | Typical test shape |
| ------------ | ------------------- |
| When X is **created/configured** | Trigger create → observe property (behavioural) |
| When X is **requested/attempted** | Trigger action → assert denied/permitted (behavioural or dry-run) |
| When **traffic/data/access** occurs | Trigger activity → query log sink (two-service: resource + `logging`) |
| When subscription/account **is initialized** | Often **not behavioural** — one-shot invariant; mark `@NotTestable` or policy |
| **Attempt** + **verify denied** | Identity-scoped client + expect error (secrets, CN01-style) |
| **Log** / **capture** | `Trigger*` or service action + `logging.QueryLogs(type, …)` |

### Step 2: Inventory generic features and plan layout

Before planning new files, read **`modules/features/generic/CCC.Core/`** and note which inherited ARs already have scenarios there (or in another shared folder such as `vpc/CCC.Core/` for CN06).

Document in `analysis.md`:

1. A **Feature reuse from generic** table: Core AR → existing generic (or shared) feature path → action (`add @<service> tag` vs `new feature under <service-folder>/`).
2. The intended on-disk layout for **new-only** scenarios.
3. Whether the service needs **`port/`** (PerPort TLS/SSH/TCP) catalog dirs in runner discovery — see [BasicServiceRunner.go](../../modules/runner/BasicServiceRunner.go): today `port/` is loaded for `object-storage` and `virtual-machines`; `vpc/` for `virtual-machines` and `serverless-computing`.

**Do not create directories or files** on disk — only `analysis.md` is written in this skill.

Reference [modules/features/README.md](../../modules/features/README.md) for naming and routing:

```text
modules/features/
  generic/                    # shared Core — tag new services here when steps are generic
    CCC.Core/
      CCC-Core-CN04-AR01.feature   # @PerService + {service-type}
  <service-folder>/
    analysis.md               # sole file created by this skill
    <CatalogId>/              # planned — native ARs only, typically
      <AR-id>.feature
    CCC.Core/                 # planned — ONLY when generic steps do not fit (rare)
  port/                       # @PerPort TLS/SSH/TCP probes (CN01, CN12-style)
```

**Reuse rules:**

| Situation | Plan |
| ----------- | ------ |
| AR uses `generic.Service` methods (`UpdateResourcePolicy`, `TriggerDataWrite`, `GetResourceRegion`, …) | Add `@<service>` to existing file in `generic/` |
| AR is `@NotTestable` stub already in generic | Add `@<service>` to same stub |
| AR is `@PerPort` (TLS, SSH, protocol, TCP deny) | Add `@<service>` in `generic/` or `port/`; routed by `@PerPort` |
| AR needs a method not on `generic.Service` | New feature under `<service-folder>/` + minimal cloud-api method |
| AR copied from object-storage with hardcoded service API (`CreateBucket`, …) | **Do not copy** — generalize to `{service-type}` + generic methods, or write service-specific steps only if unavoidable |

**Service folder naming** (kebab-case, plural where existing):

| Catalog path | `metadata.id` | Features folder | Factory `service` id |
| -------------- | --------------- | ----------------- | ---------------------- |
| `catalogs/networking/vpc` | `CCC.VPC` | `vpc` | `vpc` |
| `catalogs/storage/object` | `CCC.ObjStor` | `object-storage` | `object-storage` |
| `catalogs/compute/virtual-machines` | `CCC.VM` | `virtual-machines` | `virtual-machines` |
| `catalogs/compute/serverless-computing` | `CCC.SvlsComp` | `serverless-computing` | `serverless-computing` |
| `catalogs/crypto/secrets` | `CCC.SecMgmt` | `secrets` (new) | `secrets` (new) |

### Step 3: Classify each AR

For every AR (native + inherited that you will cover), assign **one** primary disposition:

| Disposition | Meaning | Feature tag |
| ------------- | --------- | ------------- |
| **Behavioural** | Active trigger + observable outcome in the test run | `@Behavioural` |
| **Not testable** | Cannot be honestly triggered in CI (subscription init, alert delivery, etc.) | `@NotTestable` + comment |
| **Covered elsewhere** | AR owned by another catalog (e.g. Core CN04 in ObjStor features) | Reference path only |

Document **gaps** explicitly in `analysis.md` (e.g. “AR text says ‘all relevant information’ but test only checks log-status=OK”).

### Step 4: Per-AR test approach

For each **Behavioural** or **Destructive** AR, write a short subsection in `analysis.md`:

1. **Requirement (quote)** — verbatim `text` from catalog
2. **Reuse** — generic/shared feature path, or “new under `<service-folder>/`” with reason
3. **Interpretation** — what “when” and “must” mean operationally
4. **Approach** — the steps you would take to test the service
5. **Fixtures / config** — what must exist in `modules/cloud-api-test/terraform` and privateer vars (no discovery or resource creation in Go)

For ARs covered by **tag-only reuse**, a brief **service implementation note** under the generic feature is enough — do not repeat full Gherkin steps already in `generic/`.

Notes:

- **Prefer the two-service logging pattern** for any “must log / capture” AR:
  - trigger the loggable activity (`TriggerDataWrite`, `GenerateTestTraffic`, `UpdateResourcePolicy`, …)
  - use the `logging` service: `QueryLogs(resourceID, logType, lookbackMinutes)` with explicit sink config in privateer vars
  - Do **not** embed log-query logic on the resource service interface — it belongs on `logging.Service`.

- **Prefer test identities** for access-denial ARs: `GetServiceAPIWithIdentity` + `test-user-no-access` / `test-user-read` from privateer `test-identities` — never `ProvisionUserWithAccess` in features.

- **Service interaction**: where the service under test interacts with another service (IAM, logging, object storage, etc.), assume it is available via the cloud-api factory.

### Step 5: Minimal cloud-api interface

Follow the same interface design as other services (see [`modules/cloud-api/logging/logging.go`](../../modules/cloud-api/logging/logging.go) for an example).

**Rules:**

1. **Do not add a method** if an existing `generic.Service` method fits (check [generic/service.go](../../modules/cloud-api/generic/service.go) — `UpdateResourcePolicy`, `TriggerDataWrite`, `TriggerDataRead`, `GetResourceRegion`, etc.).
2. **Do not add a method** if the scenario can call an existing method with different arguments.
3. **Return maps for exploratory ops**, typed structs for stable domain objects (see `object-storage` `Bucket` / `Object`). This allows cloud-agnostic feature steps.
4. **Every method must appear in at least one planned scenario** — otherwise omit.
5. Design the **smallest** interface that supports all planned scenarios.

List methods in a table:

| Method | Used by AR(s) | Args | Returns (key fields) |
|--------|---------------|------|----------------------|
| `ExampleMethod` | `CCC.Foo.CN01.AR01` | `resourceID string` | `Allowed bool`, `Reason string` |

If **zero** service-specific methods are needed (only generic + logging), say so — implement `Service` as `generic.Service` embed only.

### Step 6: Cross-cloud implementation matrix

For **each** method in your API, cover how implementable it is for the three main cloud APIs:

| Cloud | API / SDK | Implementation notes | Config keys (privateer vars) |
| ------- | ----------- | ---------------------- | ------------------------------ |
| AWS | e.g. `ec2:RunInstances` | … | `region`, `aws-flow-log-group-name` |
| Azure | e.g. `armnetwork` | … | `azure-log-analytics-workspace-id` |
| GCP | e.g. `compute` / `logadmin` | … | `gcp-project-id`, `gcp-flow-log-name` |

**No magical discovery.** Every sink, workspace, trail, or account name must come from config (see `types.LoggingConfig` in [types/config.go](../../modules/cloud-api/types/config.go)). If a cloud cannot support an AR without a specific prerequisite (e.g. Traffic Analytics for Azure flow logs), document it under **Prerequisites**.

Mark **unsupported** cells explicitly (`—` + rationale), not silent omission.

### Step 7: Write `analysis.md`

Use this template:

```markdown
# Behavioural test analysis: <Service display name>

- **Catalog**: `catalogs/<path>/controls.yaml`
- **Catalog id**: `<metadata.id>` (e.g. CCC.VPC)
- **Features root**: `modules/features/<service-folder>/`
- **Cloud-api package**: `modules/cloud-api/<package>/` (existing or new)
- **Factory service id**: `<service-id>`
- **Date**: <ISO date>

## Summary

<2–4 sentences: scope, number of ARs, how many behavioural vs not testable, **how many reuse generic/ vs need new features>

## Feature reuse from generic

| Core control | Generic (or shared) feature | Action for this service |
|--------------|----------------------------|-------------------------|
| CCC.Core.CN04 | `generic/CCC.Core/CCC-Core-CN04-AR01.feature` | Add `@<service>`; `{service-type}` in config |
| … | … | … |

List **new-only** ARs separately (native controls + Core ARs that generic steps cannot cover).

## Imported controls

| Reference | Action |
|-----------|--------|
| CCC.Core.CN04 | Reuse `generic/…`; add `@<service>` — implement generic embed methods only |
| CCC.Core.CN02 | **New** feature — service-specific `Get…Status` method |

## Assessment requirements

### <AR-ID> — <short title>

- **Requirement**: > <quoted catalog text>
- **Disposition**: Behavioural | Destructive | Not testable | Policy-deferred
- **Applicability**: tlp-…
- **Trigger**: …
- **Observation**: …
- **Feature sketch**: (bullet steps, not full Gherkin)
- **Config / fixtures**: …
- **Gaps / honesty notes**: …

(repeat per AR)

## Cloud-api interface (minimal)

### `<package>.Service`

<method table>

### `logging.Service` (if used, or any other service e.g. `iam.Service`)

| logType | AR(s) | resourceID meaning |
|---------|-------|-------------------|

### `generic.Service` methods used

| Method | AR(s) |
|--------|-------|

## Cross-cloud implementation

### `<MethodName>`

#### AWS
…

#### Azure
…

#### GCP
…

(repeat per method)

## Terraform fixtures (planned)

| Fixture name | Role | AR(s) | Cloud(s) |
|--------------|------|-------|----------|
| `finos-ccc-integration-<role>` | main test resource | … | aws, azure, gcp |

Note vpc good/bad/CN03 peers if applicable. Submodule path: `modules/cloud-api-test/terraform/<cloud>/modules/<service>/`.

## Integration test coverage (planned)

| api | method | cloud | expect_error | arg1 | Notes |
|-----|--------|-------|--------------|------|-------|
| `<service-id>` | `ExampleMethod` | all | | `finos-ccc-integration-…` | … |
| `logging` | `QueryLogs` | all | | `<resource>`, `admin`, `60` | … |

Vars for `modules/cloud-api-test/privateer-config/*.yml`: …

## Privateer config (planned vars)

### Behavioural (`cfi-testing/privateer-config/finos-integration/<service>/`)

| Var | Purpose | Example |
|-----|---------|---------|
| `service` / `service-type` | factory id | `virtual-machines` |
| `tags` | scenario filter | `@Behavioural @virtual-machines` |
| `resource` | resource filter (Name tag) | `finos-ccc-integration-vm-main` |
| `test-identities` | CN05 | same shape as object-storage |

### Integration (`modules/cloud-api-test/privateer-config/<cloud>.yml`)

| Var | Purpose | Example |
|-----|---------|---------|
| `resource` | CSV / GetOrProvision filter | `finos-ccc-integration-vm-main` |
| `aws-flow-log-group-name` | logging | from terraform output |

## CI actions-config (planned)

| File | `privateer-service` | `test-configuration` |
|------|---------------------|----------------------|
| `cfi-testing/actions-config/aws-<service>-finos.yaml` | `aws<Service>` | `../privateer-config/finos-integration/<service>/aws-….yml` |

## Open questions

- …
```

### Step 9: Review checklist

Before finishing:

- [ ] Every native AR in `controls.yaml` appears in `analysis.md`
- [ ] **Feature reuse from generic** table lists each inherited Core AR with path + tag-only vs new-file decision
- [ ] No planned duplication of feature files that already exist under `modules/features/generic/`
- [ ] Each behavioural AR has trigger + observation + fixtures
- [ ] Interface method count is minimal; prefer `generic.Service` embed over new methods; no duplicate “query logs” on service interface
- [ ] AWS / Azure / GCP columns filled or marked unsupported with reason
- [ ] Inherited Core ARs either point at generic/shared features or justify new service-specific scenarios
- [ ] Subscription-init / alert / MFA-at-account-layer ARs not falsely marked Behavioural
- [ ] Terraform fixtures use `finos-ccc-integration-*` naming; one main resource per service type (vpc exception documented)
- [ ] **Integration test coverage** table lists every new method + planned `expect_error` where honest
- [ ] **Privateer config** split documented: finos-integration (behavioural) vs `cloud-api-test/privateer-config` (integration)
- [ ] **actions-config** entry planned with `path` under `modules/cloud-api-test/terraform/<cloud>`
- [ ] **Only** `modules/features/<service-folder>/analysis.md` was created — no placeholder READMEs, empty catalog dirs, or `.feature` files

---

## Related skills

| Skill | Role |
|-------|------|
| This skill | Produces `analysis.md` only — planning and interface design |
| [build-features-and-cloud-api](../build-features-and-cloud-api/SKILL.md) | Implements features, cloud-api, terraform, CSV, privateer configs — run **after** approval |
