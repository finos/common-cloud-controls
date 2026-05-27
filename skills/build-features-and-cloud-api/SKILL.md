---
name: build-features-and-cloud-api
description: >-
  Implement an approved modules/features/<service>/analysis.md: Gherkin features
  (reusing generic/ where planned), cloud-api Go package and factory wiring,
  modules/integration-terraform fixtures per cloud, and cfi-testing/privateer-config.
  Use after build-service-behavioural-test-analysis when the user approves analysis
  and wants behavioural tests runnable end-to-end.
disable-model-invocation: true
---

# Build features, cloud-api, terraform, and privateer config

Turn an **approved** [`analysis.md`](../../modules/features/<service-folder>/analysis.md) into runnable behavioural tests. This skill implements the full stack; analysis-only work stays in [build-service-behavioural-test-analysis](../build-service-behavioural-test-analysis/SKILL.md).

## When to use

- `modules/features/<service-folder>/analysis.md` exists and the user has approved it.
- You need feature files, `cloud-api` implementations, integration terraform, and Privateer YAML together.
- You are adding a **new factory service id** (e.g. `virtual-machines`) or extending an existing one.

## Prerequisites

1. Read the service **`analysis.md`** end-to-end — especially **Feature reuse from generic**, **Cloud-api interface**, **Privateer config**, and **Cross-cloud implementation**.
2. Confirm **factory service id**, **features folder name**, and **catalog id(s)** match the analysis header.
3. Have cloud credentials available only for **optional** verification runs; implementation must not depend on live cloud access.

## Scope and honesty

| Goal | Non-goal |
|------|----------|
| Exercise **all** planned cloud-api methods and feature steps in CI/dev | Every scenario **passes** on first terraform apply |
| One **modular** terraform root per cloud provider covering **all services that already have behavioural tests** | Production-hardened infra |
| Privateer configs wired to terraform **outputs** | Magical discovery of log sinks or resource names |

Terraform and configs may use **minimal** resources (single “good” fixture per service). Optional “bad” fixtures are only required when analysis explicitly calls for negative-path validation.

## Outputs

| Artifact | Location |
|----------|----------|
| Feature files (new + generic tags) | `modules/features/` |
| Service interface + cloud impls | `modules/cloud-api/<package>/` |
| Factory registration | `modules/cloud-api/factory/*_factory.go` |
| Runner feature discovery (if needed) | `modules/runner/BasicServiceRunner.go` |
| Service type registry (if new id) | `modules/cloud-api/types/test.go` |
| Integration terraform | `modules/integration-terraform/<aws\|azure\|gcp>/` |
| Privateer configs | `cfi-testing/privateer-config/` |
| Env helper (optional) | `modules/integration-terraform/<cloud>/env.sh.example` |

Update `modules/features/README.md` routing rules when adding a **new** service tag.

---

## Workflow

Copy and track progress:

```
Implementation progress:
- [ ] Step 0: Re-read analysis.md — extract reuse table, methods, vars
- [ ] Step 1: Features (generic tags → new .feature files)
- [ ] Step 2: cloud-api package + factory (AWS, Azure, GCP)
- [ ] Step 3: Runner discovery + ServiceTypes (if new service)
- [ ] Step 4: integration-terraform (per cloud, all services)
- [ ] Step 5: privateer-config + outputs mapping
- [ ] Step 6: Build workspace + smoke notes
- [ ] Step 7: Review checklist
```

### Step 0: Extract implementation checklist from analysis

From `analysis.md`, build a working checklist:

| Analysis section | Implementation task |
|------------------|---------------------|
| Feature reuse from generic | List files to tag with `@<service>` |
| New-only features | Create under `<service-folder>/` or `port/` |
| Cloud-api interface table | Go interface + methods per cloud |
| generic.Service methods | Implement on service struct (embed or delegate) |
| logging.Service | Reuse package; set explicit sink vars in terraform outputs |
| Privateer config (planned vars) | Keys in `services.*.vars` |
| Cross-cloud implementation | SDK calls per method |

---

### Step 1: Feature files

Follow [modules/features/README.md](../../modules/features/README.md) for layout and tags.

#### 1a. Reuse generic (default)

For each row in **Feature reuse from generic**:

1. Open the listed file under `modules/features/generic/CCC.Core/` (or shared path such as `vpc/CCC.Core/`).
2. Add the service tag to **every scenario** that should run for this service (e.g. `@virtual-machines`), alongside existing tags (`@Behavioural`, `@PerService`, etc.).
3. Ensure scenarios use `{ServiceType}` (not a hardcoded service id) where the file already does — set `ServiceType: <factory-id>` in Privateer vars.
4. Do **not** copy the file into `<service-folder>/CCC.Core/`.

#### 1b. New service-specific features

Create only paths listed as **new** in analysis, e.g.:

```
modules/features/<service-folder>/
  CCC.Core/
    CCC-Core-CN02-AR01.feature
  <CatalogId>/                    # native ARs only
    CCC-<Catalog>-CN01-AR01.feature
```

Naming: `CCC-<ControlFamily>-<AR>.feature` (match existing repos).

**Gherkin conventions** (match object-storage / generic):

- `Given a cloud api for "{Config}" in "api"`
- `GetServiceAPI` / `GetServiceAPIWithIdentity` with `{ServiceType}` or literal factory id per analysis
- Identity keys: `testUserNoAccess`, `testUserRead`, `testUserWrite`, `testUserAdmin` — never `ProvisionUserWithAccess`
- Logging ARs: `GetServiceAPI` → `logging`, then `QueryLogs` with explicit `logType` (`admin`, `data-write`, `data-read`)
- Attach results for reports: `I attach "{result}" to the test output as "..."`
- Steps use the DSL provided by https://github.com/robmoffat/standard-cucumber-steps/blob/main/README.md (which you should either read or see examples of in the other feature files)

#### 1d. @NotTestable

Add service tag to existing `@NotTestable` scenarios in generic; keep `Then no-op required` and honesty comments.

---

### Step 2: cloud-api package

#### Package layout

Mirror existing services ([`object-storage`](../../modules/cloud-api/object-storage/), [`vpc`](../../modules/cloud-api/vpc/)):

```
modules/cloud-api/<package>/
  <service>.go              # Service interface (if not only generic.Service)
  aws-<service>.go
  azure-<service>.go
  gcp-<service>.go
```

Do not provide mocks or tests, we are going to test with integration tests later.

**Rules** (from analysis + [generic/service.go](../../modules/cloud-api/generic/service.go)):

1. Service struct **implements `generic.Service`** unless analysis says otherwise.
2. Do **not** add methods that duplicate `generic.Service` or `logging.Service` (or any other service).
3. Implement only methods in the analysis **Cloud-api interface** table.
4. Read config via `types.Config` — `config.Get("kebab-key")`, `config.LoggingConfig()`, etc. **No discovery** of log sinks or accounts.
5. `GetOrProvisionTestableResources`: return pre-provisioned resources tagged in terraform (`CFIControlSet`, `Name` = `cfi-<deployment>-...`); do not create production resources in CI unless analysis requires it.
6. `TearDown`: remove only resources created during the test run; no-op if nothing created.
7. Identity-scoped clients: follow [`factory.GetServiceAPIWithIdentity`](../../modules/cloud-api/factory/factory.go) pattern in `aws_factory.go` / `azure_factory.go` / `gcp_factory.go`.

#### Factory registration

In each of `factory/aws_factory.go`, `factory/azure_factory.go`, `factory/gcp_factory.go`:

- Add `case "<factory-service-id>":` in `GetServiceAPI` and `GetServiceAPIWithIdentity`.
- Cache instances in `serviceCache` like `object-storage` and `vpc`.

#### Types registry

If the factory id is new, append to `types.ServiceTypes` in [`types/test.go`](../../modules/cloud-api/types/test.go).

#### Build verification

```bash
cd modules/cloud-api && go build ./...
cd modules/runner && go build ./...
cd modules/ccc-behavioural-plugin && go build .
```

---

### Step 3: Runner feature discovery

[`collectFeaturePaths`](../../modules/runner/BasicServiceRunner.go) loads:

- `modules/features/<serviceName>/*` (catalog subdirs), when present
- `modules/features/generic/*` — **always** (shared CCC.Core scenarios)
- `modules/features/port/*` — for `object-storage` only (PerPort TLS scenarios)

**PerPort for other services** (e.g. `virtual-machines`): extend the `port` branch in `collectFeaturePaths` when that service needs `modules/features/port/`, and document in `modules/features/README.md`.

**Shared CN06** in `vpc/CCC.Core/`: tag scenarios with `@<service>` and append `vpc` catalog dirs for that service if needed, or move CN06 to `generic/` long-term.

**Tag filtering**: Privateer `vars.tags` (e.g. `@Behavioural @virtual-machines`) is ANDed with runner tags; every implemented scenario must include both the service tag and `@Behavioural` (or `@Destructive`, `@NotTestable`) as appropriate.

---

### Step 3: integration-terraform

Create **`modules/integration-terraform/`** as the **single place** for CFI behavioural fixtures in this repo (legacy stacks may remain under `ccc-cfi-compliance/remote/` until migrated).

#### Layout (one root per cloud)

```
modules/integration-terraform/
  README.md
  aws/
    versions.tf
    variables.tf
    main.tf                 # wires child modules
    outputs.tf              # unified map for privateer / env.sh
    provider.tf.example
    modules/
      shared/               # tags, naming locals
      logging/              # CloudTrail, Log Analytics, etc. — shared sinks
      test-identities/      # IAM users / Entra apps / GCP SAs (optional per service)
      vpc/
      object-storage/
      virtual-machines/
      serverless-computing/ # when implemented
  azure/
    ... same pattern ...
  gcp/
    ... same pattern ...
```

#### Design principles

1. **Modular**: each service = one terraform submodule under `<cloud>/modules/<service>/`.
2. **Single apply per cloud**: `terraform apply` in `aws/` (or `azure/`, `gcp/`) stands up **all** services that have behavioural tests for that provider.
3. **Deployment suffix** (terraform only): optional variable `deployment_suffix` (e.g. `20260527t120000z`) — prefix resource names `cfi-${var.deployment_suffix}-...`. Values are copied **literally** into privateer-config after apply; do not use `${INSTANCE_ID}` or other runtime indirection in YAML.
4. **Consistent tags** on every resource:

   ```hcl
   CFIControlSet = "CCC.VPC"   # or CCC.ObjStor, CCC.VM, etc.
   Name          = "cfi-${var.deployment_suffix}-<role>"
   ManagedBy     = "Terraform"
   Project       = "CCC-CFI-Compliance"
   ```

5. **Outputs contract**: root `outputs.tf` exposes a **stable shape** Privateer can consume — prefer a map per service plus shared logging/identity outputs:

   ```hcl
   output "deployment_suffix" { value = var.deployment_suffix }

   output "vpc" {
     value = {
       resource_name            = module.vpc.vpc_name
       receiver_vpc_id          = module.vpc.receiver_vpc_id
       aws_flow_log_group_name  = module.logging.flow_log_group_name
       # ...
     }
   }

   output "object_storage" { value = { ... } }
   output "virtual_machines" { value = { ... } }
   ```

6. **Exercise code, not compliance**: resources may be minimal (one VPC, one bucket, one VM). Missing optional controls is acceptable if analysis documents `@NotTestable` or honesty gaps.
7. **No secrets in terraform state files in git** — output client ids; secrets via `azure-env.sh`, `aws-env.sh` etc.

#### README

`modules/integration-terraform/README.md` must document:

- Prerequisites (AWS CLI, `az login`, gcloud ADC)
- `terraform init && terraform apply -var=deployment_suffix=...` per cloud
- How outputs map to Privateer vars
- That **passing all behavioural tests is not required** for the example stack

---

### Step 4: privateer-config

Add YAML under [`cfi-testing/privateer-config/`](../../cfi-testing/privateer-config/).

- **one file per cloud / service combination**.
- include any vars described in the analysis.
- create examples to test the integration terraform created in step 3.

#### Structure (follow existing configs)

Reference [`aws-vpc-good.yml`](../../cfi-testing/privateer-config/aws-vpc-good.yml) and [`azure-cloud-storage.yml`](../../cfi-testing/privateer-config/azure-cloud-storage.yml):

**Rules:**

1. **Hard-code resource names** from terraform outputs in YAML (see `aws-vpc-good.yml`). Comment which terraform output each value came from.
2. Use `${AZURE_*}` / `${AWS_*}` env vars **only for credentials and account/subscription ids** — expanded by `ExpandVars` in the plugin. 
3. Every **logging** var must match terraform outputs (`aws-flow-log-group-name`, `azure-log-analytics-workspace-id`, …).
4. `resource` var filters the run to one fixture (Name tag, container name, etc.).
5. `test-identities` block shape must match [`types.Config.Identity`](../../modules/cloud-api/types/config.go); prefer `${AZURE_TEST_USER_*_USER_NAME}` from `azure-env.sh` for `user-name` fields.
6. Document in config header: `terraform output` commands used to populate vars after apply.
7. Log service details must match [`types.Config.LoggingConfig](../../modules/cloud-api/types/config.go).

#### env helper

Optional `aws-env.sh`, `azure-env.sh` etc.  Update this with any environment needed. 

---

### Step 6: Build and smoke test

```bash
# From repo root
export GOWORK=modules/go.work
./cfi-testing/run-compliance-tests.sh \
  -c cfi-testing/privateer-config/aws-integration.yml 
```

Expect **some failures** until terraform and implementations mature — success for this skill means:

- Workspace builds (`go build ./...` in go.work modules)
- Godog discovers features (no “no feature directories” error)
- Scenarios **execute** cloud-api methods (not compile/skip panics)

---

## Cross-cutting reference

### Services with behavioural tests today

When extending **integration-terraform**, include modules for each row that has features under `modules/features/`:

### generic.Service implementation map (typical VM / serverless)

| Method | VM typical behaviour |
|--------|----------------------|
| `UpdateResourcePolicy` | Tag flip on instance |
| `TriggerDataWrite` | Tag or harmless attribute change |
| `TriggerDataRead` | DescribeInstance / Get |
| `GetResourceRegion` | Instance region |
| `GetReplicationStatus` | Return error or `@NotTestable` |
| `GetOrProvisionTestableResources` | List by `CFIControlSet` + `resource` var |

### What not to create

- Don't Duplicate generic Core features under `<service-folder>/` when analysis says reuse
- Don't add Placeholder `README.md` in every catalog subfolder
- Don't try to create terraform that tries to pass every test on first apply (unless user explicitly asks)
- Don't rewrite Log sink discovery in Go — all sinks explicit in vars

---

## Review checklist

Before finishing:

- [ ] Every **new** feature path from analysis exists; every **reuse** row has service tags on generic/shared files
- [ ] `cloud-api` builds; factory registers service on AWS, Azure, GCP (or documents `—` unsupported per analysis)
- [ ] `generic.Service` methods from analysis implemented or honestly return errors
- [ ] Runner loads `generic/` automatically; extend `port/` in `collectFeaturePaths` if the service needs PerPort scenarios
- [ ] `integration-terraform/<cloud>/` applies as one root; submodules per service; README documents apply + outputs
- [ ] `privateer-config` entries use explicit resource names from terraform outputs (no `${INSTANCE_ID}`)
- [ ] `modules/features/README.md` updated if new service tag added
- [ ] No secrets committed; `*.tfstate` gitignored
- [ ] Analysis skill cross-link satisfied: implementation matches **Feature reuse** and **method count** in analysis
- [ ] All assessment requirements have an associated feature file (whether inherited from generic or created for this service)

---

## Related skills

| Skill | Role |
|-------|------|
| [build-service-behavioural-test-analysis](../build-service-behavioural-test-analysis/SKILL.md) | Produces `analysis.md` only — run **before** this skill |
| This skill | Implements features, cloud-api, terraform, privateer |
