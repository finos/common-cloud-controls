---
name: build-service-behavioural-test-analysis
description: >-
  Analyse a CCC service control catalog and produce analysis.md plus a minimal
  cloud-api interface design for behavioural tests. Use when ingesting
  catalogs/networking/vpc/controls.yaml, catalogs/crypto/secrets/controls.yaml,
  or other catalogs/*/*/controls.yaml, creating modules/features folders, or
  planning @Behavioural Gherkin scenarios before implementation.
disable-model-invocation: true
---

# Build service behavioural test analysis

Produce **`analysis.md`** and a **minimal `cloud-api` interface sketch** before writing feature files or Go implementations. This skill covers **analysis and design only** — implementation belongs in [build-service-behavioural-tests](../build-service-behavioural-tests/SKILL.md) (when present).

## When to use

- A new or updated `catalogs/<category>/<service>/controls.yaml` needs behavioural test coverage.
- You are asked to plan how to test assessment requirements (ARs) on AWS, Azure, and GCP.
- You need to decide which methods belong on the service interface vs `logging.Service` vs `generic.Service`.

## Outputs

| Output | Location |
|--------|----------|
| Feature tree (empty dirs + placeholder README optional) | `modules/features/<service-folder>/` |
| Analysis document | `modules/features/<service-folder>/analysis.md` |
| Interface sketch (in analysis only — no Go yet) | Section inside `analysis.md` |

Do **not** create `.feature` files or implement Go in this skill unless the user explicitly asks to continue to implementation.

---

## Workflow

Copy and track progress:

```
Analysis progress:
- [ ] Step 1: Ingest catalog + metadata
- [ ] Step 2: Create features folder layout
- [ ] Step 3: Classify every AR (testable / not / inherited)
- [ ] Step 4: Draft per-AR test approach
- [ ] Step 5: Design minimal cloud-api interface(s)
- [ ] Step 6: Cross-cloud implementation notes (AWS / Azure / GCP)
- [ ] Step 7: Write analysis.md
- [ ] Step 8: Review — interface count, AR coverage, gaps
```

### Step 1: Ingest the control catalog

Read **both**:

1. `catalogs/<path>/controls.yaml` — controls, ARs, imported-controls
2. `catalogs/<path>/metadata.yaml` — catalog `id` (e.g. `CCC.VPC`, `CCC.SecMgmt`), CSP service names, docs URLs

From `controls.yaml` extract for each AR:

| Field | Source |
|-------|--------|
| AR id | `assessment-requirements[].id` |
| Requirement text | `assessment-requirements[].text` |
| Applicability | `assessment-requirements[].applicability` (TLP tags) |
| Parent control | `controls[].id`, `title`, `objective` |

From `imported-controls` list **inherited** CCC.Core (or other) ARs that apply to this service but are defined elsewhere. Plan separate feature files under `CCC.Core/` when those ARs need service-specific scenarios (see existing `modules/features/vpc/CCC.Core/`).

**Parse the AR sentence.** Most ARs follow:

> **When** \<trigger condition\>, the service **MUST** \<expected behaviour\>.

Map to test shape:

| AR pattern | Typical test shape |
|------------|-------------------|
| When X is **created/configured** | Trigger create → observe property (behavioural) |
| When X is **requested/attempted** | Trigger action → assert denied/permitted (behavioural or dry-run) |
| When **traffic/data/access** occurs | Trigger activity → query log sink (two-service: resource + `logging`) |
| When subscription/account **is initialized** | Often **not behavioural** — one-shot invariant; mark `@NotTestable` or policy |
| **Attempt** + **verify denied** | Identity-scoped client + expect error (secrets, CN01-style) |
| **Log** / **capture** | `Trigger*` or service action + `logging.QueryLogs(type, …)` |

### Step 2: Create the features folder

Follow [modules/features/README.md](../../modules/features/README.md).

```
modules/features/<service-folder>/
  analysis.md                 # this skill's main deliverable
  <CatalogId>/                # e.g. CCC.VPC, CCC.SecMgmt, CCC.ObjStor
    <AR-id>.feature           # created later — not in this skill
  CCC.Core/                   # only if imported Core ARs need service-specific scenarios
```

**Service folder naming** (kebab-case, plural where existing):

| Catalog path | `metadata.id` | Features folder | Factory `service` id |
|--------------|---------------|-----------------|----------------------|
| `catalogs/networking/vpc` | `CCC.VPC` | `vpc` | `vpc` |
| `catalogs/storage/object` | `CCC.ObjStor` | `object-storage` | `object-storage` |
| `catalogs/crypto/secrets` | `CCC.SecMgmt` | `secrets` (new) | `secrets` (new) |

### Step 3: Classify each AR

For every AR (native + inherited that you will cover), assign **one** primary disposition:

| Disposition | Meaning | Feature tag |
|-------------|---------|-------------|
| **Behavioural** | Active trigger + observable outcome in the test run | `@Behavioural` |
| **Not testable** | Cannot be honestly triggered in CI (subscription init, alert delivery, etc.) | `@NotTestable` + comment |
| **Covered elsewhere** | AR owned by another catalog (e.g. Core CN04 in ObjStor features) | Reference path only |

Document **gaps** explicitly in `analysis.md` (e.g. “AR text says ‘all relevant information’ but test only checks log-status=OK”).

### Step 4: Per-AR test approach

For each **Behavioural** or **Destructive** AR, write a short subsection in `analysis.md`:

1. **Requirement (quote)** — verbatim `text` from catalog
2. **Interpretation** — what “when” and “must” mean operationally
3. **Approach** - the steps you would take to test the service
5. **Fixtures / config** — what must exist in terraform or privateer vars (no discovery or resource creation)

Notes:

- **Prefer the two-service logging pattern** for any “must log / capture” AR:
  - trigger the loggable activity (`TriggerDataWrite`, `GenerateTestTraffic`, `UpdateResourcePolicy`, …)
  - use the `logging` service: `QueryLogs(resourceID, logType, lookbackMinutes)` with explicit sink config in privateer vars
  - Do **not** embed log-query logic on the resource service interface since it's already on the logging service.

- **Prefer test identities** for access-denial ARs: `GetServiceAPIWithIdentity` + `testUserNoAccess` / `testUserRead` from privateer `test-identities` — never `ProvisionUserWithAccess` in features.

- **Service Interaction**: where the service under test interacts with another service (iam, logging, object storage etc.) assume that the service will be available via the cloud-api layer. 

### Step 5: Minimal cloud-api interface

Follow the same interface design as with other services (see modules/cloud-api/logging/logging.go for an example).  

**Rules:**

1. **Do not add a method** if an existing `generic.Service` method fits (check [generic/service.go](../../modules/cloud-api/generic/service.go)).
2. **Do not add a method** if the scenario can call an existing method with different arguments.
3. **Return maps for exploratory ops**, typed structs for stable domain objects (see `object-storage` `Bucket` / `Object`).  This allows us to write in a cloud-agnostic manner.
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
|-------|-----------|----------------------|------------------------------|
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

<2–4 sentences: scope, number of ARs, how many behavioural vs not testable>

## Imported controls

| Reference | Action |
|-----------|--------|
| CCC.Core.CN04 | Reuse CCC.Core features; add <service> scenario for … |

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

## Privateer config (planned vars)

| Var | Purpose | Example |
|-----|---------|---------|

## Open questions

- …
```

### Step 8: Review checklist

Before finishing:

- [ ] Every native AR in `controls.yaml` appears in `analysis.md`
- [ ] Each behavioural AR has trigger + observation + fixtures
- [ ] Interface method count is minimal; no duplicate “query logs” on service interface
- [ ] AWS / Azure / GCP columns filled or marked unsupported with reason
- [ ] Inherited Core ARs either referenced or given a service-specific plan
- [ ] Subscription-init / alert / MFA-at-account-layer ARs not falsely marked Behavioural

