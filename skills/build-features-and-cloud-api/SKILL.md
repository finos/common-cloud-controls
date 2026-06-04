---
name: build-features-and-cloud-api
description: >-
  Implement an approved modules/features/<service>/analysis.md: Gherkin features
  (reusing generic/ where planned), cloud-api Go package and factory wiring,
  modules/cloud-api-test/terraform fixtures per cloud, integration_calls.csv,
  modules/cloud-api-test/privateer-config, cfi-testing/privateer-config/finos-integration,
  and cfi-testing/actions-config. Use after build-service-behavioural-test-analysis
  when the user approves analysis and wants behavioural tests runnable end-to-end.
disable-model-invocation: true
---

# Build features, cloud-api, terraform, and privateer config

Turn an **approved** [`analysis.md`](../../modules/features/<service-folder>/analysis.md) into runnable behavioural tests. This skill implements the full stack; analysis-only work stays in [build-service-behavioural-test-analysis](../build-service-behavioural-test-analysis/SKILL.md).

## When to use

- `modules/features/<service-folder>/analysis.md` exists and the user has approved it.
- You need feature files, `cloud-api` implementations, integration terraform and Privateer YAML together (see outputs below).
- You are adding a **new factory service id** (e.g. `virtual-machines`) or extending an existing one.

## Prerequisites

1. Read the service **`analysis.md`** end-to-end — especially **Feature reuse from generic**, **Cloud-api interface**, **Privateer config**, and **Cross-cloud implementation**.
2. Confirm **factory service id**, **features folder name**, and **catalog id(s)** match the analysis header.

## Scope and honesty

| Goal | Non-goal |
|------|----------|
| Exercise **all** planned cloud-api methods via `modules/cloud-api-test` (`integration_calls.csv` + Godog features) | Every scenario **passes** on first terraform apply |
| One **modular** terraform root per cloud provider covering **all services that already have behavioural tests** | Production-hardened infra |
| Privateer configs wired to terraform **outputs** | Magical discovery of log sinks or resource names |

Terraform and configs may use **minimal** and **cheap** resources (one VM, one function, one VPC). Optional good/bad fixtures apply **only to `vpc`**. Missing optional controls on other services is acceptable if analysis documents `@NotTestable` or honesty gaps.

## Outputs

| Artifact | Location |
|----------|----------|
| Feature files (new + generic tags) | `modules/features/` |
| Service interface + cloud impls | `modules/cloud-api/<package>/` |
| Factory registration | `modules/cloud-api/factory/*_factory.go` |
| Runner feature discovery (if needed) | `modules/runner/BasicServiceRunner.go` |
| Service type registry (if new id) | `modules/cloud-api/types/test.go` |
| Integration terraform | `modules/cloud-api-test/terraform/<aws\|azure\|gcp>/` |
| Integration test CSV | `modules/cloud-api-test/integration_calls.csv` |
| Minimal Privateer vars (integration) | `modules/cloud-api-test/privateer-config/{aws,azure,gcp}.yml` |
| Behavioural Privateer configs | `cfi-testing/privateer-config/finos-integration/<service>/` |
| CI action wiring | `cfi-testing/actions-config/<provider>-<service>-finos.yaml` |
| Access control provisioning | `modules/cloud-api-test/environment-config/provision-{aws,azure,gcp}.sh` |

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
- [ ] Step 4: cloud-api-test terraform (per cloud, all services)
- [ ] Step 5: integration_calls.csv + minimal privateer-config
- [ ] Step 6: finos-integration privateer-config + actions-config
- [ ] Step 7: Build workspace + smoke (integration + behavioural)
- [ ] Step 8: Review checklist
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
| Privateer config (planned vars) | Keys in behavioural `services.*.vars` and integration YAML |
| Cross-cloud implementation | SDK calls per method |

---

### Step 1: Feature files

Follow [modules/features/README.md](../../modules/features/README.md) for layout and tags.

#### 1a. Reuse generic (default)

For each row in **Feature reuse from generic**:

1. Open the listed file under `modules/features/generic/CCC.Core/` (or shared path such as `vpc/CCC.Core/`).
2. Add the service tag to **every scenario** that should run for this service (e.g. `@virtual-machines`), alongside existing tags (`@Behavioural`, `@PerService`, etc.).
3. Ensure scenarios use `{service-type}` (not a hardcoded service id) where the file already does — set `service-type: <factory-id>` in Privateer vars.
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

- `Given a cloud api for "{config}" in "api"`
- `GetServiceAPI` / `GetServiceAPIWithIdentity` with `{service-type}` or literal factory id per analysis
- Identity keys: `test-user-no-access`, `test-user-read`, `test-user-write`, `test-user-admin` — never `ProvisionUserWithAccess`
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

Do not provide mocks or unit tests in `cloud-api` — exercise implementations via `modules/cloud-api-test` integration tests and Godog features.

**Rules** (from analysis + [generic/service.go](../../modules/cloud-api/generic/service.go)):

1. Service struct **implements `generic.Service`** unless analysis says otherwise.
2. Do **not** add methods that duplicate `generic.Service` or `logging.Service` (or any other service).
3. Implement only methods in the analysis **Cloud-api interface** table.
4. Read config via `types.Config` — `config.Get("kebab-key")`, `config.LoggingConfig()`, etc. **No discovery** of log sinks or accounts.
5. `GetOrProvisionTestableResources`: return pre-provisioned resources from terraform (`CFIControlSet`, `Name` = `finos-ccc-integration-<role>`); filter by `resource` var when set. Do not create production resources in CI unless analysis requires it.
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
- `modules/features/port/*` — for `object-storage` and `virtual-machines` (PerPort TLS / connection probes)


**PerPort for other services**: extend the `port` branch in `collectFeaturePaths` when that service needs `modules/features/port/`, and document in `modules/features/README.md`.

**Tag filtering**: Privateer `vars.tags` (e.g. `@Behavioural @virtual-machines`) is ANDed with runner tags; every implemented scenario must include both the service tag and `@Behavioural` (or `@Destructive`, `@NotTestable`) as appropriate.

---

### Step 4: cloud-api-test terraform

Create or extend **`modules/cloud-api-test/terraform/`** as the **single place** for CFI integration fixtures in this repo (legacy stacks may remain under `ccc-cfi-compliance/remote/` until migrated).

#### Layout (one root per cloud)

```
modules/cloud-api-test/terraform/
  aws/
    versions.tf
    variables.tf
    main.tf                 # wires child modules
    outputs.tf              # unified map per service
    provider.tf.example
    modules/
      logging/              # CloudTrail, Log Analytics, etc. — shared sinks
      vpc/
      object-storage/
      virtual-machines/
      serverless-computing/
  azure/
    ... same pattern ...
  gcp/
    ... same pattern ...
```

See [`modules/cloud-api-test/README.md`](../../modules/cloud-api-test/README.md) for apply prerequisites and output mapping.

#### Design principles

1. **Modular**: each service = one terraform submodule under `<cloud>/modules/<service>/`.
2. **Single apply per cloud**: `terraform apply` in `aws/` (or `azure/`, `gcp/`) stands up **all** services that have behavioural tests for that provider.
3. **Resource naming contract**:
   - Every integration fixture name should include the integration marker string `finos-ccc-integration`.
   - Standard pattern where allowed: `finos-ccc-integration-<role>` (for example `finos-ccc-integration-fn-main`, `finos-ccc-integration-vpc-bad`).
   - For providers with naming restrictions (no hyphens, lowercase only, tight length): use normalized marker `finoscccintegration` (example: `finoscccintegration<random>` for globally unique storage account names).
   - **One testable resource per service type** (`virtual-machines`, `serverless-computing`, …). Supporting network/storage/IAM for that resource is fine. **Exception: `vpc`** may provision good/bad fixtures and CN03 peer networks for negative-path testing.
   - Values are copied **literally** into privateer YAML after apply; do not use `${INSTANCE_ID}` or other runtime indirection in YAML.
4. **Consistent tags** on every resource:

   ```hcl
   CFIControlSet = "CCC.VPC"   # or CCC.ObjStor, CCC.VM, etc.
   Name          = "finos-ccc-integration-<role>"
   ManagedBy     = "Terraform"
   Project       = "CCC-CFI-Compliance"
   ```

5. **Outputs contract**: root `outputs.tf` exposes a **stable shape** — prefer a map per service plus shared logging outputs:

   ```hcl
   output "vpc" {
     value = {
       resource_name            = module.vpc.vpc_name
       receiver_vpc_id          = module.vpc.receiver_vpc_id
       aws_flow_log_group_name  = module.vpc.aws_flow_log_group_name
       # ...
     }
   }

   output "object_storage" { value = { ... } }
   output "virtual_machines" { value = { ... } }
   ```

6. **Exercise code, not compliance**: one testable resource per service type (except `vpc`, which may include good/bad fixtures). Missing optional controls is acceptable if analysis documents `@NotTestable` or honesty gaps.
7. **No secrets in terraform state files in git** — output client ids; secrets via `modules/cloud-api-test/environment-config/*-env.sh`.
8. **MINIMAL terraform, minimize expense** — we are creating an integration environment to test `cloud-api`, not passing the full CCC conformance suite on first apply.

---

### Step 5: integration_calls.csv + minimal privateer-config

After terraform and cloud-api methods exist, wire the **reflection integration test** layer ([`modules/cloud-api-test/README.md`](../../modules/cloud-api-test/README.md)).

#### integration_calls.csv

Add rows for every new or changed method on the factory service id (and `logging` rows where applicable):

```csv
api,method,cloud,expect_error,arg1,arg2,arg3,arg4
virtual-machines,UpdateResourcePolicy,all,,finos-ccc-integration-vm-main,,
logging,QueryLogs,all,,finos-ccc-integration-vm-main,admin,60,
```

- `api`: factory service id (`virtual-machines`, `object-storage`, `logging`, …).
- `cloud`: `all` runs on every provider; otherwise `aws`, `azure`, or `gcp` only.
- `expect_error`: `true` when the call is expected to fail (optional API, missing fixture, provider limitation).
- `arg1`…`arg4`: literal values matching terraform fixture names (not env var placeholders).

Update [`privateer-config/{aws,azure,gcp}.yml`](../../modules/cloud-api-test/privateer-config/aws.yml) with any new vars the CSV rows need (`resource`, `function-name`, `host-name`, logging keys, etc.). These files are **one per cloud**, minimal keys only — not full behavioural catalog config.

#### Smoke (integration)

```bash
cd modules/cloud-api-test
# After: terraform apply under terraform/<cloud>/ and source environment-config/*-env.sh
./run-integration-tests.sh aws    # or azure | gcp | all
```

Success means all relevant CSV rows **PASS** for that provider (some `expect_error=true` rows are PASS by design). See [`work.md`](../../modules/cloud-api-test/work.md) for provider-specific notes.

---

### Step 6: finos-integration privateer-config + actions-config

Behavioural Godog runs use a **second** config surface under `cfi-testing/`.

#### finos-integration privateer-config

Add one YAML per **cloud / service** under [`cfi-testing/privateer-config/finos-integration/`](../../cfi-testing/privateer-config/finos-integration/):

```
cfi-testing/privateer-config/finos-integration/
  virtual-machines/
    aws-virtual-machines.yml
    azure-virtual-machines.yml
    gcp-virtual-machines.yml
  serverless-computing/
    ...
  cloud-storage/
    azure-cloud-storage.yml
    ...
```

Reference existing configs:

- [`azure-cloud-storage.yml`](../../cfi-testing/privateer-config/finos-integration/cloud-storage/azure-cloud-storage.yml)
- [`aws-virtual-machines.yml`](../../cfi-testing/privateer-config/finos-integration/virtual-machines/aws-virtual-machines.yml)

**Rules:**

1. **Hard-code resource names** from `modules/cloud-api-test/terraform/<cloud>` outputs. Comment which `terraform output` each value came from.
2. Use `${AZURE_*}` / `${AWS_*}` / `${GCP_*}` env vars **only for credentials and account/subscription/project ids** — expanded by `ExpandVars` in the plugin.
3. Every **logging** var must match terraform outputs (`aws-flow-log-group-name`, `azure-log-analytics-workspace-id`, …).
4. `resource` var filters the run to one fixture (Name tag, container name, etc.).
5. `test-identities` block shape must match [`types.Config.Identity`](../../modules/cloud-api/types/config.go); prefer `${AZURE_TEST_USER_*_USER_NAME}` from `modules/cloud-api-test/environment-config/azure-env.sh` (and AWS/GCP equivalents).
6. Document in config header: `terraform output` commands used to populate vars after apply.
7. Log service details must match [`types.Config.LoggingConfig`](../../modules/cloud-api/types/config.go).
8. Include `plugin: ccc-behavioural-plugin`, `service` / `service-type`, `tags`, and `catalog-locations` per analysis.

#### actions-config (CI matrix)

Add [`cfi-testing/actions-config/<provider>-<service>-finos.yaml`](../../cfi-testing/actions-config/) so [`.github/workflows/cfi-test.yml`](../../.github/workflows/cfi-test.yml) picks up the new target:

```yaml
cfi:
  id: aws-virtual-machines
  provider: aws
  service: ec2
  name: CCC AWS Virtual Machines Fixture
  description: >-
    Runs behavioural checks for CCC.VM against the AWS virtual machines fixture.
  path: https://github.com/finos/common-cloud-controls/tree/main/modules/cloud-api-test/terraform/aws
  test-on-branches:
    - main
  git: https://github.com/finos/common-cloud-controls
  test-configuration: ../privateer-config/finos-integration/virtual-machines/aws-virtual-machines.yml
  privateer-service: awsVirtualMachines
```

- `path` must point at `modules/cloud-api-test/terraform/<cloud>` (not the legacy `modules/integration-terraform` path).
- `test-configuration` is relative to the actions-config file and must match the finos-integration YAML you added.
- `privateer-service` must match the top-level `services.<id>` key in that YAML.

#### User provisioning

This contains a very limited set of generic user accounts we can use to test different test cases.  Extend the privileges of these accounts for the integration testing terraform.  Avoid creating too many accounts.  

```bash
cd modules/cloud-api-test/environment-config
./provision-aws.sh    # or provision-azure.sh / provision-gcp.sh
source ./aws-env.sh              # matching *-env.sh for your cloud
```

---

### Step 7: Build and smoke test

#### Integration (fast API coverage)

```bash
export GOWORK=modules/go.work
cd modules/cloud-api-test
./run-integration-tests.sh aws
```

#### Behavioural (Godog via Privateer)

```bash
export GOWORK=modules/go.work
source modules/cloud-api-test/environment-config/aws-env.sh   # or azure-env.sh / gcp-env.sh

./cfi-testing/run-compliance-tests.sh \
  -c cfi-testing/privateer-config/finos-integration/virtual-machines/aws-virtual-machines.yml \
  -S awsVirtualMachines \
  -s virtual-machines \
  -g '@Behavioural'
```

Expect **some behavioural failures** until terraform and implementations mature. Success for this skill means:

- Workspace builds (`go build ./...` in go.work modules)
- Integration CSV rows for new methods **PASS** (or `expect_error` as documented)
- Godog discovers features (no “no feature directories” error)
- Scenarios **execute** cloud-api methods (not compile/skip panics)

---

## Cross-cutting reference

### Two verification layers

| Layer | What it tests | How to run |
|-------|---------------|------------|
| **Integration** | Every `integration_calls.csv` row hits cloud-api via reflection | `modules/cloud-api-test/run-integration-tests.sh` |
| **Behavioural** | Gherkin scenarios + catalog applicability | `cfi-testing/run-compliance-tests.sh` + finos-integration YAML |

Both share the same terraform fixtures under `modules/cloud-api-test/terraform/`.

### Services with behavioural tests today

When extending **cloud-api-test terraform**, include submodules for each service that has features under `modules/features/` (e.g. `object-storage`, `vpc`, `virtual-machines`, `serverless-computing`).

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

- Don't duplicate generic Core features under `<service-folder>/` when analysis says reuse
- Don't add placeholder `README.md` in every catalog subfolder
- Don't try to create terraform that passes every behavioural test on first apply (unless user explicitly asks)
- Don't rewrite log sink discovery in Go — all sinks explicit in vars

---

## Review checklist

Before finishing:

- [ ] Every **new** feature path from analysis exists; every **reuse** row has service tags on generic/shared files
- [ ] `cloud-api` builds; factory registers service on AWS, Azure, GCP (or documents `—` unsupported per analysis)
- [ ] `generic.Service` methods from analysis implemented or honestly return errors
- [ ] Runner loads `generic/` automatically; extend `port/` / `vpc/` in `collectFeaturePaths` if the service needs those dirs
- [ ] `modules/cloud-api-test/terraform/<cloud>/` applies as one root; submodules per service
- [ ] `integration_calls.csv` has rows for new methods; `privateer-config/{aws,azure,gcp}.yml` updated
- [ ] `cfi-testing/privateer-config/finos-integration/<service>/` YAML uses explicit resource names from terraform outputs
- [ ] `cfi-testing/actions-config/*-finos.yaml` added; `path` points at `modules/cloud-api-test/terraform/<cloud>`
- [ ] `modules/features/README.md` updated if new service tag added
- [ ] No secrets committed; `*.tfstate` gitignored
- [ ] Analysis skill cross-link satisfied: implementation matches **Feature reuse** and **method count** in analysis
- [ ] All assessment requirements have an associated feature file (whether inherited from generic or created for this service)

---

## Related skills

| Skill | Role |
|-------|------|
| [build-service-behavioural-test-analysis](../build-service-behavioural-test-analysis/SKILL.md) | Produces `analysis.md` only — run **before** this skill |
| This skill | Implements features, cloud-api, terraform, integration CSV, privateer configs |
