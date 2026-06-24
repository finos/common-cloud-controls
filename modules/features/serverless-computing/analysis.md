# Behavioural test analysis: Serverless Computing

- **Catalog**: `catalogs/compute/serverless-computing/controls.yaml`
- **Catalog id**: `CCC.SvlsComp`
- **Features root**: `modules/features/serverless-computing/`
- **Cloud-api package**: `modules/cloud-api/serverless-computing/` (new)
- **Factory service id**: `serverless-computing`
- **Date**: 2026-05-27

## Summary

The serverless catalog defines **two native controls** with **two behavioural ARs** (CN01 private endpoints, CN02 invocation rate limits) plus **nine imported CCC.Core controls**. CN01 needs **two complementary scenarios** (private invoke sanity + public access denial or absence). Imported Core coverage mirrors object-storage patterns where applicable; **Core CN01 (TLS)**, **CN03 (MFA)**, **CN07 (enumeration alerts)**, **CN09**, and **CN10** are largely `@NotTestable` at the function layer. Planned service-specific interface: **5 methods** (+ generic + logging).

## Imported controls

| Reference | Action |
| ----------- | -------- |
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
- **Control intent** (from catalog objective): the function must be accessible **only through a private endpoint** — network isolation, not merely “login required on a public URL.”
- **Interpretation**:
  - **Data-plane** public paths (Function URL, public API Gateway stage, public Cloud Functions HTTP trigger) are in scope for CN01.
  - **Control-plane** `lambda:Invoke` / ARM invoke over the cloud API with IAM deny is **CN05**, not CN01 — the AWS control plane is always internet-reachable; IAM gating is access control, not private-endpoint enforcement.
  - **Authentication on a public URL** (e.g. Lambda Function URL with `AuthType: AWS_IAM`) does **not** satisfy CN01: the endpoint is still on the public internet; unauthenticated callers get 403, authenticated callers from the internet can still invoke. That pattern belongs under **CCC.Core.CN05**, not CN01.

#### Two scenarios (both required for an honest CN01 story)

| Scenario | Tag | Good fixture expectation | Bad fixture expectation |
|----------|-----|--------------------------|-------------------------|
| **A — Private invoke** | `@SANITY` `@OPT_IN` | Invoke via `private-endpoint-url` (or VPC-internal path) **succeeds** | Same — private path should still work |
| **B — Public access** | `@MAIN` | No public invoke surface **or** public attempt **denied** | Public attempt **succeeds** → compliance failure |

**Scenario B splits again depending on whether a public invoke surface exists:**

| Case | Good fixture | How to test B |
|------|--------------|---------------|
| **No public endpoint configured** | Compliant private-only function | `GetInvokeEndpointExposure` → `PublicEndpointConfigured` is false. An active HTTP probe is **impossible** (nothing to hit) — absence of a public surface **is** the pass condition. Do not treat “no URL in config” as proof without the describe step. |
| **Public endpoint exists** (bad fixture only) | Non-compliant function with Function URL / public API GW | `public-invoke-url` **required** in config (or URL returned by `GetInvokeEndpointExposure`). `AttemptPublicInternetInvoke` without credentials → must fail for good / succeed for bad. |

#### Approach

1. **`GetInvokeEndpointExposure("{uid}")`** — read the function resource via cloud API (not log-sink discovery): returns `PublicEndpointConfigured`, `PublicEndpointURL`, `PrivateEndpointConfigured`, `PrivateEndpointURL`. Catches **false passes** when a function is publicly invokable but an operator omitted `public-invoke-url` from YAML.
2. **Scenario A**: `AttemptPrivateInvoke("{uid}")` using `private-endpoint-url` from config → assert success.
3. **Scenario B (good)**:
   - Assert `PublicEndpointConfigured` is false; **or**
   - If `public-invoke-url` is explicitly set (edge-case dual-homed test fixture), assert `AttemptPublicInternetInvoke` → `AccessDenied` true (connection refused, timeout, or HTTP error — **not** merely 403 from IAM auth on an intentionally public URL).
4. **Scenario B (bad)**: `public-invoke-url` must be set → `AttemptPublicInternetInvoke` → invoke succeeds → test **fails** (proves detector works).

#### Feature sketch

```text
Background: api + serverless-computing service

Scenario A (@SANITY @OPT_IN): private path works
  When AttemptPrivateInvoke("{uid}")
  Then success

Scenario B (@MAIN): no public internet invoke surface (good fixture)
  When GetInvokeEndpointExposure("{uid}")
  Then PublicEndpointConfigured is false

Scenario B (@MAIN): public invoke probe (when public-invoke-url or exposure API provides a URL)
  When AttemptPublicInternetInvoke("{uid}")
  Then AccessDenied is true          # good fixture: public path blocked or unreachable

# Bad-fixture validation (separate privateer config, e.g. aws-serverless-bad.yml):
#   Same steps; expect scenario failure when AttemptPublicInternetInvoke succeeds
#   (proves the behavioural test detects a publicly invokable function).
```

#### Config / fixtures

| Var | Good fixture | Bad fixture |
| ----- | -------------- | ------------- |
| `private-endpoint-url` | **Required** — URL/ARN for Scenario A | **Required** |
| `public-invoke-url` | Empty; exposure API must confirm no public surface | **Required** — actual public Function URL / API GW URL |
| `function-name` | Resource under test | Same |

#### Gaps / honesty notes

- **Config-only public probe is unsafe**: if the function has a public URL but config omits it, a probe that only reads YAML will **skip Scenario B and false-pass**. Always call `GetInvokeEndpointExposure` before concluding compliance.
- **403 ≠ private endpoint**: HTTP 403 from IAM auth on a public Function URL means “unauthenticated denied,” not “not on public internet.”
- **Scenario B inactive on good fixture** is correct when `PublicEndpointConfigured` is false — the AR’s “attempt … over the public internet” is satisfied by proving **no such path exists**, not by probing a non-existent URL.
- **CN05 separation**: unauthorized `lambda:Invoke` via AWS API → identity-scoped test, not CN01.

### CCC.SvlsComp.CN02.AR01 — Function invocation rate limits

- **Requirement**: > Send requests to invoke the function up to the allowed threshold and confirm they are successful; then send additional requests exceeding the threshold from the same entity and verify that they are denied.
- **Disposition**: Behavioural (Destructive — many invocations)
- **Interpretation**: Same **entity** (same principal / same concurrency bucket) must hit account or function reserved concurrency / throttle limit.
- **Approach**:
  1. Read `rate-limit-threshold` from config (must match terraform reserved concurrency or API GW throttle).
  2. `InvokeFunctionBurst("{uid}", threshold)` → assert all succeed.
  3. `InvokeFunctionBurst("{uid}", threshold + N)` → assert additional invocations return throttled/denied (`TooManyRequestsException`, 429, etc.).
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
- **Approach**: `GetFunctionEncryptionStatus("{uid}")` — environment variables KMS key, secrets integration, platform encryption flags.
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
- **Approach**: `GetServiceAPIWithIdentity(..., "test-user-no-access")` + `InvokeFunction` → error; admin identity + `UpdateFunctionConfiguration` → success optional.

### CCC.Core.CN06.AR01 — Region compliance

- **Disposition**: Behavioural
- **Approach**: `GetResourceRegion` + `{permitted-regions}` check.

### CCC.Core.CN01.*, CN03.*, CN07.*, CN09.*, CN10.*

- **Disposition**: `@NotTestable` at serverless layer (document in feature stubs).

---

## Cloud-api interface (minimal)

### `serverlesscomputing.Service`

| Method | Used by AR(s) | Args | Returns (key fields) |
| -------- | --------------- | ------ | ---------------------- |
| `GetInvokeEndpointExposure` | SvlsComp.CN01.AR01 | `functionID string` | `PublicEndpointConfigured`, `PublicEndpointURL`, `PrivateEndpointConfigured`, `PrivateEndpointURL` |
| `AttemptPrivateInvoke` | SvlsComp.CN01.AR01 (Scenario A) | `functionID string` | `Invoked`, `StatusCode`, `Error` |
| `AttemptPublicInternetInvoke` | SvlsComp.CN01.AR01 (Scenario B) | `functionID string` | `AccessDenied`, `Invoked`, `StatusCode`, `Error` |
| `InvokeFunctionBurst` | SvlsComp.CN02.AR01 | `functionID string`, `count int` | `SuccessCount`, `ThrottledCount`, `FailedCount`, `AllSucceeded` |
| `GetFunctionEncryptionStatus` | Core.CN02.AR01 | `functionID string` | `EnvEncrypted`, `KMSKeyArn`, `SecretsEncrypted` |

`GetInvokeEndpointExposure` reads the **resource under test** (Function URL config, API GW integration, ingress settings). This is not log-sink discovery — it prevents false passes when config omits a public URL that exists in the cloud.

`AttemptPublicInternetInvoke` uses `public-invoke-url` from config when set; otherwise uses `PublicEndpointURL` from `GetInvokeEndpointExposure` (so undeclared public URLs are still probed). If neither is available, return a clear error — do not silently pass.

`AttemptPrivateInvoke` uses `private-endpoint-url` from config; fails fast if unset.

**Optional collapse**: `InvokeFunctionBurst(..., 1)` for CN05 single invoke via identity-scoped service.

### `logging.Service`

| logType | AR(s) | resourceID meaning |
| --------- | ------- | ------------------- |
| `admin` | CN04.AR01 | Function name / ARN |
| `data-write` | CN04.AR02 | Function name |
| `data-read` | CN04.AR03 | Function name |

### `generic.Service` methods used

| Method | AR(s) |
| -------- | ------- |
| `GetOrProvisionTestableResources` | all |
| `GetResourceRegion` | CN06.AR01 |
| `UpdateResourcePolicy` | CN04.AR01 |
| `TriggerDataWrite` | CN04.AR02 — v1: config tag bump; strict: invoke payload causing side effect |
| `TearDown` | no-op |

**Method count: 5** service-specific.

---

## Cross-cloud implementation

### `GetInvokeEndpointExposure`

#### AWS

- **API**: `lambda:GetFunctionUrlConfig`, `lambda:GetPolicy` (public principal check), `apigateway:GetRestApis` / integration lookup if applicable.
- **Notes**: `PublicEndpointConfigured=true` when Function URL exists or resource policy allows `Principal: *` on invoke URL path.
- **Config**: `function-name`, `region`.

#### Azure

- **API**: Functions app settings + private endpoint connection resources; compare public `defaultHostName` vs `*.privatelink.*` hostname.
- **Config**: `azure-function-app-name`, `azure-resource-group`.

#### GCP

- **API**: `cloudfunctions.v2.GetFunction` — `serviceConfig.ingressSettings` (`ALLOW_ALL` vs `ALLOW_INTERNAL_ONLY`).
- **Config**: `gcp-project-id`, `region`, `function-name`.

### `AttemptPrivateInvoke`

#### AWS

- **API**: `lambda:Invoke` via **VPC interface endpoint** or HTTP to private API GW / internal ALB URL from config.
- **Config**: `private-endpoint-url` (required), `function-name`.

#### Azure

- **API**: HTTP POST to `private-endpoint-url` (Private Link FQDN).
- **Config**: `private-endpoint-url`.

#### GCP

- **API**: Invoke via internal URL / VPC connector path from config.
- **Config**: `private-endpoint-url`.

### `AttemptPublicInternetInvoke`

#### AWS

- **API**: HTTP to Function URL or public API GW URL **without** auth credentials — from test runner on public internet. Expect connection failure, timeout, or non-2xx (not IAM 403 on an auth-gated public URL counted as “private”).
- **Notes**: Do **not** use `lambda:Invoke` SDK from runner as the CN01 probe — that tests IAM (CN05). Good fixture: no Function URL; exposure API confirms none.
- **Config**: `public-invoke-url` (required on bad fixture; optional on good if testing dual URL), `function-name`.

#### Azure

- **API**: HTTP to public `*.azurewebsites.net` hostname (not `*.privatelink.*`).
- **Notes**: Expect timeout / 403 / connection refused when only private endpoint is enabled.
- **Config**: `public-invoke-url`, `private-endpoint-url`.

#### GCP

- **API**: HTTP to public `cloudfunctions.net` / Cloud Run URL when ingress is internal-only → 403.
- **Config**: `public-invoke-url`, `function-name`, `ingress-settings`.

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

Same pattern as object-storage: harmless metadata change + [`logging.QueryLogs`](../../cloud-api/logging/logging.go). Explicit log sink vars per cloud (`types.LoggingConfig`).

---

## Privateer config (planned vars)

| Var | Purpose | Good fixture | Bad fixture |
| ----- | --------- | -------------- | ------------- |
| `service` | factory id | `serverless-computing` | same |
| `tags` | filter | `@Behavioural @serverless-computing` | `@Behavioural` |
| `resource` | resource filter | `cfi-…-fn-good` | `cfi-…-fn-bad` |
| `private-endpoint-url` | CN01 Scenario A | **required** | **required** |
| `public-invoke-url` | CN01 Scenario B | empty (verify via exposure API) | **required** |
| `rate-limit-threshold` | CN02 | `10` | `10` |
| `burst-overrun` | CN02 | `5` | `5` |
| `permitted-regions` | CN06 | `[us-east-1]` | same |
| `test-identities` | CN05 | object-storage pattern | same |
| `azure-log-analytics-workspace-id` | CN04 | `${AZURE_LOG_ANALYTICS_WORKSPACE_ID}` | same |

Plan separate privateer configs: `aws-serverless-good.yml` (no public URL, exposure confirms) and `aws-serverless-bad.yml` (public URL enabled, `public-invoke-url` set).

---

## Open questions

- CN02: reserved concurrency vs account concurrency limit — terraform should pin function-level limit.
- Should Azure target Functions or Container Apps for “serverless” parity?
- Dual-homed test fixture (both public and private URLs on same function) — useful for lab, or keep good/bad as separate stacks only?
- Add `@serverless-computing` to `modules/features/README.md` routing rules?

---

## Review checklist

- [x] Every native AR (CN01.AR01, CN02.AR01) documented
- [x] CN01 documents two scenarios (private invoke + public access / absence)
- [x] False-pass risk documented when public URL exists but config omits it
- [x] Auth-on-public-URL distinguished from private-endpoint CN01 intent
- [x] Each behavioural AR has approach + fixtures
- [x] Interface includes `GetInvokeEndpointExposure` (5 service-specific methods)
- [x] AWS / Azure / GCP per method
- [x] Inherited Core classified
- [x] MFA / alert ARs not falsely Behavioural
