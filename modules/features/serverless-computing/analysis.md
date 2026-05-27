# Behavioural test analysis: Serverless Computing

- **Catalog**: `catalogs/compute/serverless-computing/controls.yaml`
- **Catalog id**: `CCC.SvlsComp`
- **Features root**: `modules/features/serverless-computing/`
- **Cloud-api package**: `modules/cloud-api/serverless-computing/` (new)
- **Factory service id**: `serverless-computing`
- **Date**: 2026-05-27

## Summary

The serverless catalog defines **two native controls** with **two behavioural ARs** (CN01 private endpoints, CN02 invocation rate limits) plus **nine imported CCC.Core controls**. Native ARs map cleanly to **invoke / HTTP probe** tests. Imported Core coverage mirrors VM/object-storage patterns where applicable; **CN01 (TLS)**, **CN03 (MFA)**, **CN07 (enumeration alerts)**, **CN09**, and **CN10** are largely `@NotTestable` at the function layer. Planned service-specific interface: **2 methods** (+ generic + logging).

## Imported controls

| Reference | Action |
|-----------|--------|
| CCC.Core.CN01 | Partial — `@NotTestable` for Lambda unless function URL exposes TLS port; no generic SSH/TLS port on FaaS |
| CCC.Core.CN02 | Config/behavioural — encryption at rest for env vars/secrets (describe function config) |
| CCC.Core.CN03 | `@NotTestable` — MFA is IAM/console |
| CCC.Core.CN04 | Service-specific — invoke + `logging.QueryLogs` (admin/data) |
| CCC.Core.CN05 | Identity-scoped invoke deny/allow |
| CCC.Core.CN06 | `GetResourceRegion` on function resource |
| CCC.Core.CN07 | `@NotTestable` (mirror object-storage CN07) |
| CCC.Core.CN09 | `@NotTestable` |
| CCC.Core.CN10 | `@NotTestable` — no replication API for functions |

---

## Native assessment requirements

### CCC.SvlsComp.CN01.AR01 — Deny public internet access

- **Requirement**: > Attempt to access the serverless function over the public internet and verify that access is denied.
- **Disposition**: Behavioural
- **Applicability**: tlp-red, tlp-amber
- **Interpretation**: Function must be reachable only via private endpoint (VPC Lambda, Private Link, internal URL). Public invoke paths — **function URL (public)**, **API Gateway without auth**, **public IP** — must fail.
- **Approach**:
  1. Pre-provisioned function `{UID}` with **no public auth path** (AWS: Lambda in VPC + no public URL; Azure: private endpoint only; GCP: internal-only ingress).
  2. `AttemptPublicInternetInvoke("{UID}")` — HTTP(S) or SDK invoke from **outside** trust perimeter without private connectivity.
  3. Assert `{result.AccessDenied}` true OR connection error / HTTP 403 / IAM `AccessDeniedException`.
  4. Optional `@SANITY`: `AttemptAuthorizedInvoke` via private path succeeds.
- **Feature sketch**:
  - Background: api + `serverless-computing` service
  - When `AttemptPublicInternetInvoke` on `{UID}`
  - Then `AccessDenied` is true
- **Config / fixtures**:
  - `public-invoke-url` — intentionally unset or points to disabled URL for good fixture
  - `private-invoke-arn` / `function-name` for sanity path
  - Bad fixture: function with **public** function URL enabled → expect test failure when run against bad config
- **Gaps / honesty notes**: “Public internet” vs “public AWS API endpoint with IAM deny” — document which path is tested. VPC-only Lambda still has public **control plane**; test must target **data-plane invoke**, not `lambda:Invoke` from unauthorized principal (that is CN05).

### CCC.SvlsComp.CN02.AR01 — Function invocation rate limits

- **Requirement**: > Send requests to invoke the function up to the allowed threshold and confirm they are successful; then send additional requests exceeding the threshold from the same entity and verify that they are denied.
- **Disposition**: Behavioural (Destructive — many invocations)
- **Interpretation**: Same **entity** (same principal / same concurrency bucket) must hit account or function reserved concurrency / throttle limit.
- **Approach**:
  1. Read `rate-limit-threshold` from config (must match terraform reserved concurrency or API GW throttle).
  2. `InvokeFunctionBurst("{UID}", threshold)` → assert all succeed.
  3. `InvokeFunctionBurst("{UID}", threshold + N)` → assert additional invocations return throttled/denied (`TooManyRequestsException`, 429, etc.).
  4. Use synchronous invoke with short handler (minimal duration) to maximize request rate.
- **Feature sketch**:
  - Given `{RateLimitThreshold}` from config
  - When burst invoke at threshold → `{result.AllSucceeded}` true
  - When burst invoke at threshold+5 → `{result.ThrottledCount}` > 0
- **Config / fixtures**:
  - `rate-limit-threshold`: e.g. `10` (must match `reserved_concurrent_executions` or API GW burst)
  - `burst-overrun`: e.g. `5`
  - Function handler completes in <100ms
- **Gaps / honesty notes**: Cold starts and account-level concurrency can skew counts — use reserved concurrency on function to isolate. Async invoke vs sync may differ on throttling semantics — pick one and document.

---

## Assessment requirements (inherited Core)

### CCC.Core.CN02.AR01 — Encryption at rest

- **Requirement**: > When data is stored, it MUST be encrypted using the latest industry-standard encryption methods.
- **Disposition**: Behavioural (config inspection)
- **Approach**: `GetFunctionEncryptionStatus("{UID}")` — environment variables KMS key, secrets integration, platform encryption flags.
- **Gaps**: No user “data” stored on function itself except env/secrets; honesty note in feature.

### CCC.Core.CN04.AR01 — Log admin changes

- **Disposition**: Behavioural
- **Approach**: `UpdateResourcePolicy` (harmless description/tag change on function) → wait → `QueryLogs(..., "admin", ...)`.

### CCC.Core.CN04.AR02 / AR03 — Log data write/read

- **Disposition**: Behavioural (tlp-dependent)
- **Approach**: Authorized `InvokeFunction` that writes/read function-local storage (e.g. `/tmp` is not logged) — **strict mapping**: invoke that touches **external storage** (S3 put via function role) OR treat **InvokeFunction** as data-plane event if CloudTrail data events enabled for Lambda.
- **Gaps**: Lambda data events optional; fixture must enable.

### CCC.Core.CN05.AR01 / AR02 — Unauthorized invoke / admin

- **Disposition**: Destructive + Behavioural
- **Approach**: `GetServiceAPIWithIdentity(..., "testUserNoAccess")` + `InvokeFunction` → error; admin identity + `UpdateFunctionConfiguration` → success optional.

### CCC.Core.CN06.AR01 — Region compliance

- **Disposition**: Behavioural
- **Approach**: `GetResourceRegion` + `{PermittedRegions}` check.

### CCC.Core.CN01.*, CN03.*, CN07.*, CN09.*, CN10.*

- **Disposition**: `@NotTestable` at serverless layer (document in feature stubs).

---

## Cloud-api interface (minimal)

### `serverlesscomputing.Service`

| Method | Used by AR(s) | Args | Returns (key fields) |
|--------|---------------|------|----------------------|
| `AttemptPublicInternetInvoke` | SvlsComp.CN01.AR01 | `functionID string` | `AccessDenied bool`, `StatusCode`, `Error` |
| `InvokeFunctionBurst` | SvlsComp.CN02.AR01 | `functionID string`, `count int` | `SuccessCount`, `ThrottledCount`, `FailedCount`, `AllSucceeded` |
| `GetFunctionEncryptionStatus` | Core.CN02.AR01 | `functionID string` | `EnvEncrypted`, `KMSKeyArn`, `SecretsEncrypted` |

**Optional collapse**: If `InvokeFunctionBurst(..., 1)` covers single invoke, CN05 can reuse burst with count=1 via identity-scoped service — no fourth method.

### `logging.Service`

| logType | AR(s) | resourceID meaning |
|---------|-------|-------------------|
| `admin` | CN04.AR01 | Function name / ARN |
| `data-write` | CN04.AR02 | Function name |
| `data-read` | CN04.AR03 | Function name |

### `generic.Service` methods used

| Method | AR(s) |
|--------|-------|
| `GetOrProvisionTestableResources` | all |
| `GetResourceRegion` | CN06.AR01 |
| `UpdateResourcePolicy` | CN04.AR01 |
| `TriggerDataWrite` | CN04.AR02 — v1: config tag bump; strict: invoke payload causing side effect |
| `TearDown` | no-op |

**Method count: 3** service-specific.

---

## Cross-cloud implementation

### `AttemptPublicInternetInvoke`

#### AWS
- **API**: HTTP GET to `function-url` if configured public OR `lambda.Invoke` from runner **without** VPC endpoint when function is VPC-only (expect `AccessDeniedException` / timeout on URL).
- **Notes**: Good fixture: Lambda in VPC, no Function URL, resource policy deny `Principal: *`.
- **Config**: `function-name`, `public-function-url` (empty for good), `aws-lambda-invoke-mode`.

#### Azure
- **API**: HTTP to function app **public** hostname vs private endpoint hostname (`*.privatelink.*`).
- **Notes**: Attempt resolve + connect to public FQDN; expect 403/timeout when private-only.
- **Config**: `azure-function-app-name`, `private-endpoint-fqdn`, `public-hostname`.

#### GCP
- **API**: HTTP to `cloudfunctions.net` / Cloud Run URL with **ingress** = internal only.
- **Notes**: Invoke from outside VPC → 403.
- **Config**: `gcp-project-id`, `region`, `function-name`, `ingress-settings`.

### `InvokeFunctionBurst`

#### AWS
- **API**: `lambda:Invoke` synchronous in loop; detect `TooManyRequestsException`.
- **Config**: `rate-limit-threshold`, function ARN, reserved concurrency set in terraform.

#### Azure
- **API**: HTTP trigger burst or `Invoke` REST API; watch for 429.
- **Config**: function key for authorized path only; throttle limit on plan.

#### GCP
- **API**: `cloudfunctions.call` or HTTP repeated invokes; 429 on quota.
- **Config**: `max-instances` / quota aligned with threshold.

### `GetFunctionEncryptionStatus`

#### AWS
- **API**: `lambda:GetFunctionConfiguration` — `KMSKeyArn`, env encryption.
- **Config**: function name.

#### Azure
- **API**: `WebApps/Get` / Functions host config — storage encryption, Key Vault refs.
- **Config**: resource group, function app name.

#### GCP
- **API**: `cloudfunctions.v2.GetFunction` — `kmsKeyName`, secret env.
- **Config**: project, region, function name.

### `UpdateResourcePolicy` / logging

Same pattern as object-storage: harmless metadata change + [`logging.QueryLogs`](../../modules/cloud-api/logging/logging.go). Explicit log sink vars per cloud (`types.LoggingConfig`).

---

## Privateer config (planned vars)

| Var | Purpose | Example |
|-----|---------|---------|
| `service` | factory id | `serverless-computing` |
| `tags` | filter | `@Behavioural @serverless-computing` |
| `instance-id` | fixture id | `20260527t120000z` |
| `function-name` | resource filter | `cfi-20260527t120000z-fn-good` |
| `rate-limit-threshold` | CN02 | `10` |
| `burst-overrun` | CN02 | `5` |
| `public-function-url` | CN01 (bad only) | `https://...` or empty |
| `private-endpoint-url` | CN01 sanity | `https://...privatelink...` |
| `permitted-regions` | CN06 | `[us-east-1]` |
| `test-identities` | CN05 | object-storage pattern |
| `azure-log-analytics-workspace-id` | CN04 data logs | `${AZURE_LOG_ANALYTICS_WORKSPACE_ID}` |

---

## Open questions

- AWS CN01: test **Function URL** vs **invoke API from non-VPC runner** — which is the canonical “public internet” path?
- CN02: reserved concurrency vs account concurrency limit — terraform should pin function-level limit.
- Should Azure target Functions or Container Apps for “serverless” parity?
- Add `@serverless-computing` to `modules/features/README.md` routing rules?

---

## Review checklist

- [x] Every native AR (CN01.AR01, CN02.AR01) documented
- [x] Each behavioural AR has approach + fixtures
- [x] Interface minimal (3 methods)
- [x] AWS / Azure / GCP per method
- [x] Inherited Core classified
- [x] MFA / alert ARs not falsely Behavioural
