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

Turn an **approved** `modules/features/<service-folder>/analysis.md` into runnable behavioural tests. This skill implements the full stack; analysis-only work stays in [build-service-behavioural-test-analysis](../build-service-behavioural-test-analysis/SKILL.md).

## Layers (read these READMEs first)

Architecture is defined in [`modules/README.md`](../../modules/README.md). **Respect layer boundaries** — most of the k8s round-tripping came from treating every layer as one blob and debugging with the wrong test surface.

| Layer | Path | Owns | Does **not** own |
| ----- | ---- | ---- | ---------------- |
| **1 — Config + start** | [`cfi-testing/`](../../cfi-testing/) | Privateer YAML, `run-compliance-tests.sh`, actions-config matrix | cloud-api method semantics |
| **2 — Behavioural execution** | plugin / runner / reporters | Godog orchestration, catalog applicability, AR pass/fail | Fixture provisioning |
| **3 — Features + steps** | [`modules/features/`](../../modules/features/README.md), cloud-testing-dsl | Gherkin AR criteria, step bindings | Provider SDKs, live coverage % |
| **4 — Cloud abstraction** | [`cloud-api/`](../../modules/cloud-api/), [`cloud-api-test/`](../../modules/cloud-api-test/README.md), [`probes/`](../../modules/probes/README.md) | Factory APIs, CSV integration + coverage, probe **binaries** | CCC control verdicts |

**Rules that stop wrong-layer references:**

1. Read [`modules/cloud-api-test/README.md`](../../modules/cloud-api-test/README.md) before writing CSV rows — integration proves **our driver code**, not AR compliance. Do not duplicate full behavioural AR matrices in `integration_calls.csv` (see that README’s Kubernetes note: portable `KubeClient` probes belong in features, not CSV).
2. Read [`modules/features/README.md`](../../modules/features/README.md) for where scenarios live and how tags route — features call `cloud-api`; they do not embed terraform paths.
3. Read [`modules/probes/README.md`](../../modules/probes/README.md) for probe build/deploy manifests only. Probe docs must **not** point at `cloud-api-test/terraform/…` (fixtures are a different layer that *consumes* probe images).
4. Terraform under `cloud-api-test/terraform/<cloud>/` may **deploy** probe images into the integration cluster; that does not make probe Go packages part of the test package.
5. Debug **bottom-up**: cloud-api unit of work → local CSV → local Godog slice → GHA. Do not start in Layer 1/2 CI when Layer 4 auth/network is broken.

## When to use

- `modules/features/<service-folder>/analysis.md` exists and the user has approved it.
- You need feature files, `cloud-api` implementations, integration terraform and Privateer YAML together (see outputs below).
- You are adding a **new factory service id** (e.g. `virtual-machines`) or extending an existing one.

## Prerequisites

1. Skim [`modules/README.md`](../../modules/README.md) layer diagram and the three READMEs linked above.
2. Read the service **`analysis.md`** end-to-end — especially **Feature reuse from generic**, **Cloud-api interface**, **Privateer config**, and **Cross-cloud implementation**.
3. Confirm **factory service id**, **features folder name**, and **catalog id(s)** match the analysis header.

## Scope and honesty

| Goal | Non-goal |
| ------ | ---------- |
| Exercise **all** planned cloud-api methods via `modules/cloud-api-test` (`integration_calls.csv` + Godog features) | Every scenario **passes** on first terraform apply |
| One **modular** terraform root per cloud provider covering **all services that already have behavioural tests** | Production-hardened infra |
| Privateer configs wired to terraform **outputs** | Magical discovery of log sinks or resource names |

Terraform and configs may use **minimal** and **cheap** resources (one VM, one function, one VPC). Optional good/bad fixtures apply **only to `vpc`**. Missing optional controls on other services is acceptable if analysis documents `@NotTestable` or honesty gaps.

## Outputs

| Artifact | Location |
| ---------- | ---------- |
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

```text
Implementation progress:
- [ ] Step 1: Re-read analysis.md — extract reuse table, methods, vars
- [ ] Step 2: Features (generic tags → new .feature files)
- [ ] Step 3: cloud-api package + factory (AWS, Azure, GCP)
- [ ] Step 4: Runner discovery + ServiceTypes (if new service)
- [ ] Step 5: cloud-api-test terraform (per cloud, all services + in-cluster probes)
- [ ] Step 6: integration_calls.csv + minimal privateer-config + local CSV green
- [ ] Step 7: finos-integration privateer-config + actions-config
- [ ] Step 8: Behavioural smoke (local) then GHA confirmation
- [ ] Step 9: Review checklist
```

### Step 1: Extract implementation checklist from analysis

From `analysis.md`, build a working checklist:

| Analysis section | Implementation task |
| ------------------ | --------------------- |
| Feature reuse from generic | List files to tag with `@<service>` |
| New-only features | Create under `<service-folder>/` or `port/` |
| Cloud-api interface table | Go interface + methods per cloud |
| generic.Service methods | Implement on service struct (embed or delegate) |
| logging.Service | Reuse package; set explicit sink vars in terraform outputs |
| Privateer config (planned vars) | Keys in behavioural `services.*.vars` and integration YAML |
| Cross-cloud implementation | SDK calls per method |

---

### Step 2: Feature files

Follow [modules/features/README.md](../../modules/features/README.md) for layout and tags.

#### 2a. Reuse generic (default)

For each row in **Feature reuse from generic**:

1. Open the listed file under `modules/features/generic/CCC.Core/` (or shared path such as `vpc/CCC.Core/`).
2. Add the service tag to **every scenario** that should run for this service (e.g. `@virtual-machines`), alongside existing tags (`@Behavioural`, `@PerService`, etc.).
3. Ensure scenarios use `{service-type}` (not a hardcoded service id) where the file already does — set `service-type: <factory-id>` in Privateer vars.
4. Do **not** copy the file into `<service-folder>/CCC.Core/`.

#### 2b. New service-specific features

Create only paths listed as **new** in analysis, e.g.:

```text
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
- Steps use the DSL provided by <https://github.com/robmoffat/standard-cucumber-steps/blob/main/README.md> (which you should either read or see examples of in the other feature files)

#### 2c. @NotTestable

Add service tag to existing `@NotTestable` scenarios in generic; keep `Then no-op required` and honesty comments.

---

### Step 3: cloud-api package

#### Package layout

Mirror existing services ([`object-storage`](../../modules/cloud-api/object-storage/), [`vpc`](../../modules/cloud-api/vpc/)):

```text
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

### Step 4: Runner feature discovery

[`collectFeaturePaths`](../../modules/runner/BasicServiceRunner.go) loads:

- `modules/features/<serviceName>/*` (catalog subdirs), when present
- `modules/features/generic/*` — **always** (shared CCC.Core scenarios)
- `modules/features/port/*` — for `object-storage` and `virtual-machines` (PerPort TLS / connection probes)

**PerPort for other services**: extend the `port` branch in `collectFeaturePaths` when that service needs `modules/features/port/`, and document in `modules/features/README.md`.

**Tag filtering**: Privateer `vars.tags` (e.g. `@Behavioural @virtual-machines`) is ANDed with runner tags; every implemented scenario must include both the service tag and `@Behavioural` (or `@Destructive`, `@NotTestable`) as appropriate.

---

### Step 5: cloud-api-test terraform

Create or extend **`modules/cloud-api-test/terraform/`** as the **single place** for CFI integration fixtures in this repo (legacy stacks may remain under `ccc-cfi-compliance/remote/` until migrated).

#### Layout (one root per cloud)

```text
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
9. **In-cluster / sidecar probes belong in the same cloud root** (e.g. admission-webhook Deployment). Do **not** invent a second `*-test-infra` root for the same cluster — one `terraform apply` per cloud. Probe **Go modules** stay under `modules/probes/` (separate layer); terraform only deploys them.
10. **Grant the CI principal everything the test identity needs at apply time** — do not assume “terraform apply succeeded ⇒ GHA can call the API.” See [Lessons from bringing up managed Kubernetes](#lessons-from-bringing-up-managed-kubernetes).
11. **Prefer CI-reachable fixtures over runtime “elevate” workarounds** when analysis marks an AR `@NotTestable` on GitHub-hosted runners (e.g. public / allow-all API instead of `ElevateAccessForInspection` + CIDR lock).

---

### Step 6: integration_calls.csv + minimal privateer-config + local CSV green

After terraform and cloud-api methods exist, wire the **reflection integration test** package. Purpose and non-goals are in [`modules/cloud-api-test/README.md`](../../modules/cloud-api-test/README.md) — read it before adding rows.

This step is incomplete until **local CSV is green** for the cloud under change (CI principal shape). Do not start Step 7 or GHA while CSV still fails on dial/403/RBAC.

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
- **Trap**: `expect_error=true` PASS is **not** proof the denial path is correct. If RBAC/auth fails *before* admission/policy, privileged-deny rows look green while compliant-create rows FAIL. Fix auth first; then re-check that expected errors cite the **intended** control (PSS, webhook, policy), not `forbidden` / `access denied` from the test principal.
- `arg1`…`arg4`: literal values matching terraform fixture names (not env var placeholders).

Update [`privateer-config/{aws,azure,gcp}.yml`](../../modules/cloud-api-test/privateer-config/aws.yml) with any new vars the CSV rows need (`resource`, `function-name`, `host-name`, logging keys, etc.). These files are **one per cloud**, minimal keys only — not full behavioural catalog config.

#### Local CSV smoke (required before Step 7 / GHA)

Local CSV smoke is the primary loop. GHA is for confirmation, not first discovery of auth/network bugs.

```bash
cd modules/cloud-api-test
# After: terraform apply under terraform/<cloud>/ and source environment-config/*-env.sh
# Azure: do NOT export AZURE_CLIENT_ID into the process for DefaultAzureCredential
# (it is treated as a user-assigned MI and breaks the chain before AzureCLICredential).
./scale-fixtures.sh start -c "privateer-config/<cloud>.yml" -S integration -s kubernetes   # when compute is stopped
./run-integration-tests.sh aws    # or azure | gcp | all
```

Success means all relevant CSV rows **PASS** for that provider (some `expect_error=true` rows are PASS by design — with the **intended** error class). See [`modules/cloud-api-test/README.md`](../../modules/cloud-api-test/README.md) for provider-specific notes (including W-46 login coverage).

**Exit criteria for Step 6:** integration CSV green for the cloud under change **as the same principal shape CI uses** (for Azure: the `integration_runner_client_id` / `AZURE_CLIENT_ID` app, not only your interactive user).

---

### Step 7: finos-integration privateer-config + actions-config

Behavioural Godog runs use Layer 1 config under `cfi-testing/` (see [`modules/README.md`](../../modules/README.md)). Only start this after Step 6 is green — wiring Privateer against a broken driver wastes Actions time.

#### finos-integration privateer-config

Add one YAML per **cloud / service** under [`cfi-testing/privateer-config/finos-integration/`](../../cfi-testing/privateer-config/finos-integration/):

```text
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
8. Include `plugin: ccc-behavioural-plugin`, `service` / `service-type`, `tags`, and `catalog-versions` per analysis (e.g. `CCC.Core: v2025.10`, `CCC.SecMgmt: DEV`).

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

This contains a very limited set of generic user accounts we can use to test different test cases. Extend the privileges of these accounts for the integration testing terraform. Avoid creating too many accounts.

Also grant the **CI / integration runner** principal (Azure: `integration_runner_client_id` = GitHub `AZURE_CLIENT_ID` app) any data-plane or kube RBAC the CSV and behavioural runs need — interactive `az login` success does not imply GHA OIDC can mutate the fixture.

```bash
cd modules/cloud-api-test/environment-config
./provision-aws.sh    # or provision-azure.sh / provision-gcp.sh
source ./aws-env.sh              # matching *-env.sh for your cloud
```

---

### Step 8: Behavioural smoke (local) then GHA confirmation

Integration CSV was already proven in Step 6. This step is Layer 1–3 (Privateer + Godog), then CI as confirmation only.

#### 8a. Behavioural (Godog via Privateer) — local

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
- Step 6 CSV rows for new methods **PASS** (or `expect_error` as documented **with the right error class**)
- Godog discovers features (no “no feature directories” error)
- Scenarios **execute** cloud-api methods (not compile/skip panics)

#### 8b. GitHub Actions — confirmation only

Push / `workflow_dispatch` after Step 6 is green (and ideally a local 8a slice). When a GHA job fails:

1. Read the **job log** (and uploaded `integration-results-*.txt` artifact), not only the matrix summary.
2. Classify: network / auth / missing fixture / real product assertion.
3. Reproduce with the same classification locally (Step 6 or 8a) before the next push.
4. Avoid “fix and re-run the whole matrix” for issues already explained by CSV FAIL lines.

---

## Lessons from bringing up managed Kubernetes

Hard-won while making Azure (then AWS patterns) k8s integration green. Apply the same discipline to other control-plane–heavy services.

### What burned round-trips

| Failure mode | Symptom in CI / CSV | Fix in terraform / code (not another GHA guess) |
| ------------ | ------------------- | ---------------------------------------------- |
| API allowlist = apply-time `/32` | Dial timeout / hang after “reachability”; ElevateAccess “stuck” ≤20m | For GHA: public or allow-all API when CN01 is `@NotTestable`; do not rely on runtime elevate |
| Empty `authorized_ip_ranges` no-op / policy | TF “applied” but allowlist unchanged | Prefer explicit allow-all CIDR (`0.0.0.0/0`) where Policy rejects `[]` |
| Credential fetch works, kube RBAC does not | `User "…" cannot create/list … Update role assignment` | Grant **Azure Kubernetes Service RBAC Cluster Admin** (and Cluster User) to `integration_runner_client_id` in the **same** azure root |
| Local admin ≠ CI SP | Green on laptop, red in Actions | Smoke as CI principal shape; wire roles via `integration_runner_client_id` tfvars |
| `AZURE_CLIENT_ID` in process env | DefaultAzureCredential treats it as UAMI → chain fails | Unset for SDK runs; keep OIDC for `azure/login` only |
| Wrong ARM action path | Plain 404 on credential list | Use provider-correct singular/plural APIs (`listClusterUserCredential`) |
| `expect_error` false positive | Privileged admit PASS, compliant admit FAIL | Auth first; assert error text is admission/policy, not RBAC |
| Second terraform root for in-cluster probe | “not found” Deployment; layering fights | Deploy probes from the **main** cloud root in one apply |
| Hardcoded fixture names across layers | Probe/docs/TF naming the cluster resource | Identity stays in the cloud root; probes layer has no fixture hostnames |
| Referencing downstream tests upward | Probe README → `cloud-api-test/terraform`; CSV = full AR matrix | Follow [Layers](#layers-read-these-readmes-first); debug bottom-up |
| Cluster `Stopped` / extension `Creating` | TF CreateOrUpdate 409/400 | Start cluster; wait for idle; don’t pile applies on Failed+Stuck OMS |
| Pause image for webhook | Scale CSV PASS; real admit/deny not exercised | Pin real `modules/probes/admission-webhook` image before claiming CN11.AR03 |

### How to cut round-trips (checklist)

1. **CSV before Actions** — `run-integration-tests.sh <cloud>` locally until green.
2. **Auth matrix in terraform** — applying identity + `integration_runner_client_id` both get needed data-plane / kube roles at apply time.
3. **Match CI auth constraints in analysis** — if runners have ephemeral egress, mark CIDR-lock ARs `@NotTestable` and design fixtures accordingly (don’t invent elevate loops).
4. **One apply per cloud** — fixtures + in-cluster probes together; `scale-fixtures.sh` is runtime start/stop, not a second TF root.
5. **Classify errors** — network vs Entra/RBAC vs missing object vs real control denial; only the last belongs in a long GHA debug session.
6. **Read the FAIL line** — integration results print method + seconds + error; that is faster than re-running the whole `cfi-test` matrix.
7. **Don’t treat `expect_error` PASS as coverage** until the message matches the intended control.
8. **Verify live resource after TF** when changing network/RBAC (`az aks show`, role assignment list) — TF success ≠ Azure kept the field you wanted.

### Azure-specific notes (k8s)

- AKS with `local_account_disabled` + Azure RBAC: ARM kubeconfig host/CA + token is not enough without **Azure RBAC Cluster Admin** on the test SP.
- `kubelogin` on PATH for terraform kubernetes provider; `kubectl` optional for manual verify.
- Stuck `aks-managed-azure-monitor-logs` blocks cluster updates; wait or stop/start before fighting allowlist applies.
- Do not set job-level `AZURE_CLIENT_ID` for Go `DefaultAzureCredential` on GHA (see `cloud-api-integration.yml`).

---

## Cross-cutting reference

### Two verification surfaces (same fixtures, different questions)

Canonical layer diagram: [`modules/README.md`](../../modules/README.md). Integration vs behavioural ownership: [`modules/cloud-api-test/README.md`](../../modules/cloud-api-test/README.md).

| Surface | Layer | What it answers | How to run |
|---------|-------|-----------------|------------|
| **Integration CSV** | 4 — `cloud-api-test` | Does **our** factory/method wiring work live? | `modules/cloud-api-test/run-integration-tests.sh` |
| **Behavioural Godog** | 1–3 — `cfi-testing` + features | Do **AR scenarios** execute (and eventually pass)? | `cfi-testing/run-compliance-tests.sh` + finos-integration YAML |

Both share terraform under `modules/cloud-api-test/terraform/`. Neither replaces the other: green CSV ≠ compliant catalog; green Godog discovery ≠ covered Go branches.

Do **not** use behavioural CI to discover Layer 4 auth/network bugs, and do **not** stuff AR scenario matrices into `integration_calls.csv`.

### Services with behavioural tests today

When extending **cloud-api-test terraform**, include submodules for each service that has features under `modules/features/` (e.g. `object-storage`, `vpc`, `virtual-machines`, `serverless-computing`).

### generic.Service implementation map (typical VM / serverless)

| Method | VM typical behaviour |
| -------- | ---------------------- |
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

### Step 9: Review checklist

Before finishing:

- [ ] Layer docs consulted: [`modules/README.md`](../../modules/README.md), [`cloud-api-test/README.md`](../../modules/cloud-api-test/README.md), [`features/README.md`](../../modules/features/README.md); probe docs do not reference `cloud-api-test/terraform`
- [ ] Every **new** feature path from analysis exists; every **reuse** row has service tags on generic/shared files
- [ ] `cloud-api` builds; factory registers service on AWS, Azure, GCP (or documents `—` unsupported per analysis)
- [ ] `generic.Service` methods from analysis implemented or honestly return errors
- [ ] Runner loads `generic/` automatically; extend `port/` / `vpc/` in `collectFeaturePaths` if the service needs those dirs
- [ ] `modules/cloud-api-test/terraform/<cloud>/` applies as one root; submodules per service; in-cluster probes in that root (no second `*-test-infra` apply)
- [ ] `integration_calls.csv` has rows for new methods (driver coverage, not full AR matrices); `privateer-config/{aws,azure,gcp}.yml` updated
- [ ] Step 6: local `./run-integration-tests.sh <cloud>` green **before** GHA; expected-error rows cite the intended control, not missing RBAC
- [ ] CI / `integration_runner_client_id` principal has the same data-plane and kube roles the tests need (documented in tfvars / role assignments)
- [ ] `cfi-testing/privateer-config/finos-integration/<service>/` YAML uses explicit resource names from terraform outputs
- [ ] `cfi-testing/actions-config/*-finos.yaml` added; `path` points at `modules/cloud-api-test/terraform/<cloud>`
- [ ] `modules/features/README.md` updated if new service tag added
- [ ] No secrets committed; `*.tfstate` gitignored
- [ ] Analysis skill cross-link satisfied: implementation matches **Feature reuse** and **method count** in analysis
- [ ] All assessment requirements have an associated feature file (whether inherited from generic or created for this service)
- [ ] GHA used as confirmation after Step 6 (and preferably Step 8a), not as the first debugger for dial/403 failures

---

## Related skills

| Skill | Role |
|-------|------|
| [build-service-behavioural-test-analysis](../build-service-behavioural-test-analysis/SKILL.md) | Produces `analysis.md` only — run **before** this skill |
| This skill | Implements features, cloud-api, terraform, integration CSV, privateer configs |
