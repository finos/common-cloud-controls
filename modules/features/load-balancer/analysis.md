# Behavioural test analysis: Load Balancer

- **Catalog**: `catalogs/networking/loadbalancer/controls.yaml`
- **Catalog id**: `CCC.LB`
- **Features root**: `modules/features/load-balancer/`
- **Shared features root**: `modules/features/generic/` + `modules/features/port/` (`@PerPort`)
- **Cloud-api package**: `modules/cloud-api/load-balancer/` (new; `load-balancer` in [types/test.go](../../../modules/cloud-api/types/test.go) `ServiceTypes`)
- **Factory service id**: `load-balancer`
- **Date**: 2026-06-08
- **MP release**: [CCC.LB_v2025.07-MP.yaml](../../../website/src/data/ccc-releases/CCC.LB_v2025.07-MP.yaml)

## Summary

The Load Balancer catalog defines **eight native controls** with **nine ARs** plus **seven imported CCC.Core controls**. **Six native ARs are behavioural** on paper (CN01.AR01 rate limit, CN04 routing audit, CN05 stickiness cookie, CN07 header scrub, CN08 cert age, CN09 management API deny). **Three are not testable in CI** (CN01.AR02 alert timing, CN06 health alert, CN02 autoscale SLA).

**v1 goal (decided):** **cheapest L4 fixtures** on all clouds — **exercise** factory wiring, Go methods, integration CSV, and Cucumber steps; **do not expect behavioural ARs to pass** on out-of-the-box load balancers. Failing assertions demonstrate the gap between catalog requirements and default platform capabilities (no WAF, no header rewrite, no L7 stickiness cookies, no access-log sink, etc.).

**v1 fixture:** AWS NLB, GCP regional external passthrough NLB, Azure Standard LB — all TCP/HTTP :80 to existing integration VM. **~$50–65/mo** total across three clouds.

Inherited Core reuse is heavy: **CN04 logging trio**, **CN05 identity**, **CN06 region** via generic; **CN01 TLS** via `@PerPort` only when HTTPS is added later; **CN02** via listener describe (TLS fields empty on HTTP-only L4); **CN03/CN10** as `@NotTestable` stubs.

Planned interface: **5–6 service-specific methods** + `generic.Service` + `logging.Service`.

## Feature reuse from generic

| Core control | Generic (or shared) feature | Action for this service |
|--------------|----------------------------|-------------------------|
| CCC.Core.CN04.AR01–AR03 | `generic/CCC.Core/CCC-Core-CN04-AR0*.feature` | Add `@load-balancer`; listener/rule change + HTTP access logs |
| CCC.Core.CN05.AR06 | `generic/CCC.Core/CCC-Core-CN05-AR06.feature` | Add `@load-balancer`; identity-scoped describe/update deny |
| CCC.Core.CN06.AR01 | `vpc/CCC.Core/CCC-Core-CN06-AR01.feature` | Add `@load-balancer`; `GetResourceRegion` |
| CCC.Core.CN03 | `generic/CCC.Core/CCC-Core-CN03-AR01.feature` | Add `@load-balancer` to `@NotTestable` |
| CCC.Core.CN10.AR01 | `generic/CCC.Core/CCC-Core-CN10-AR01.feature` | Add `@load-balancer` to `@NotTestable` |
| CCC.Core.CN01.* | `generic/CCC.Core/CCC-Core-CN01-AR*.feature` + `port/` | Add `@load-balancer` `@PerPort` on HTTPS frontend (TLS version/cipher) |

**New-only (native + Core CN02):**

| AR | Planned feature path |
|----|----------------------|
| CCC.LB.CN01.AR01 | `load-balancer/CCC.LB/CCC-LB-CN01-AR01.feature` |
| CCC.LB.CN01.AR02 | `load-balancer/CCC.LB/CCC-LB-CN01-AR02.feature` |
| CCC.LB.CN04.AR01 | `load-balancer/CCC.LB/CCC-LB-CN04-AR01.feature` |
| CCC.LB.CN05.AR01 | `load-balancer/CCC.LB/CCC-LB-CN05-AR01.feature` |
| CCC.LB.CN07.AR01 | `load-balancer/CCC.LB/CCC-LB-CN07-AR01.feature` |
| CCC.LB.CN09.AR01 | `load-balancer/CCC.LB/CCC-LB-CN09-AR01.feature` |
| CCC.Core.CN02.AR01 | `load-balancer/CCC.Core/CCC-Core-CN02-AR01.feature` or `@PerPort` TLS + describe |

## Imported controls

| Reference | Action |
|-----------|--------|
| CCC.Core.CN01 | `@PerPort` HTTPS listener probe |
| CCC.Core.CN02 | `GetListenerEncryptionStatus` or infer from TLS probe + policy describe |
| CCC.Core.CN03 | `@NotTestable` |
| CCC.Core.CN04 | Reuse generic + access log sink vars |
| CCC.Core.CN05 | Extend generic identity deny on ELB/ARM/GCLB APIs |
| CCC.Core.CN06 | Reuse `vpc/CCC-Core-CN06-AR01` |
| CCC.Core.CN10 | `@NotTestable` |

---

## Assessment requirements (native)

### CCC.LB.CN01.AR01 — Rate limiting / throttling

- **Requirement**: > When a single client sends more than 2000 requests within any 5-minute sliding window, the load balancer MUST throttle all subsequent requests from that client for at least 60 seconds.
- **Disposition**: Behavioural
- **Approach**:
  1. Fixture: WAF/rate-based rule or ALB+target throttle policy tuned for **test scale** (lower threshold in terraform, e.g. 50 req / 1 min, documented as scaled-down analogue of catalog numbers).
  2. `GenerateClientTrafficBurst("{uid}", clientToken, count)` from single source IP → expect HTTP 429 or equivalent after threshold.
  3. Follow-up requests within 60s remain throttled.
- **Gaps**: Catalog cites 2000/5min — when WAF/rate rules are added later, threshold is **configurable in privateer / test config** (CI-friendly values, e.g. 50 req / 1 min); document mapping in feature comment.
- **v1 cheapest fixture:** no WAF/rate rule — burst runs, **`HTTP429Count == 0`** — **expected fail** (exercises `GenerateClientTrafficBurst`).

### CCC.LB.CN01.AR02 — Throttle events in access log

- **Requirement**: > When throttling is invoked, the load balancer MUST record the event in the access log within 5 minutes.
- **Disposition**: Behavioural
- **Approach**:
  1. Trigger throttle via CN01 burst.
  2. `logging.QueryLogs("{uid}", "access", lookback)` or LB-specific access log type → assert 429/throttle status present.
- **Config**: `lb-access-log-bucket` / Log Analytics table / GCLB log sink — explicit vars, no discovery.
- **v1 cheapest fixture:** no log sink — **expected fail** or scenario skipped until sink added.

### CCC.LB.CN02.AR01 — Autoscale at 80% capacity

- **Requirement**: > When concurrent connections reach 80 percent of capacity, the autoscaling group MUST add at least one instance within five minutes.
- **Disposition**: Not testable
- **Interpretation**: Requires sustained load to 80% connection capacity and ASG timing proof — too heavy and flaky for shared integration tenants.

### CCC.LB.CN04.AR01 — Trusted identity for routing weight changes

- **Requirement**: > When routing weights change, the request MUST originate from an explicitly defined and trusted identity and MUST be logged.
- **Disposition**: Behavioural
- **Approach**:
  1. Admin/trusted identity: `UpdateRoutingWeights("{uid}", weights)` → success.
  2. `logging.QueryLogs(..., "admin", ...)` captures change.
  3. `test-user-no-access` attempt → denied (Core CN05 overlap).
- **Config**: `trusted-principal-ids` from terraform.
- **v1 cheapest fixture:** `UpdateRoutingWeights` may no-op or fail on L4 (no listener rules); admin log row absent — **partial exercise**; identity deny leg still runnable via generic.

### CCC.LB.CN05.AR01 — Session cookie inactivity expiry

- **Requirement**: > When stickiness is enabled, session cookies MUST expire within 30 minutes of inactivity.
- **Disposition**: Behavioural
- **Approach**:
  1. Fixture enables session affinity/stickiness with idle timeout ≤ 30 minutes (terraform-documented).
  2. `ProbeHTTPResponse("{uid}", path)` — first request through the LB frontend (new TCP/client, no prior cookie).
  3. Parse `Set-Cookie` for the provider stickiness cookie (e.g. AWS `AWSALB` / `AWSELB`, Azure `ApplicationGatewayAffinity`, GCP `GCE_COOKIE` / `GCILB` — names from config var `stickiness-cookie-names`).
  4. Assert cookie carries inactivity bound ≤ 30 minutes: `Max-Age ≤ 1800`, or `Expires` within 30 minutes of response time, or provider maps duration to cookie attribute matching terraform `stickiness-idle-timeout-seconds`.
  5. Optional `@OPT_IN` sanity: `GetSessionAffinityConfiguration` describe matches cookie `Max-Age` (config ↔ wire consistency).
- **Feature sketch**:
  - When probe returns stickiness cookie
  - Then `Max-Age` (or equivalent) ≤ 1800
- **Config / fixtures**: stickiness enabled on L7 LB; `stickiness-cookie-names`, `stickiness-idle-timeout-seconds` (≤ 1800) from terraform.
- **Gaps / honesty notes**:
  - Proves **cookie the LB issues** reflects the idle cap — not that the browser session actually expires after 30 minutes of real inactivity (no wall-clock wait in CI).
  - Requires **L7** LB with stickiness (Azure Standard L4 LB does not issue affinity cookies — CN05 needs App Gateway / Front Door / AWS ALB / GCP HTTPS LB).
  - Some providers encode duration only in control-plane config with opaque cookie values; fall back to describe + cookie presence when `Max-Age` absent.
- **v1 cheapest fixture:** L4, stickiness off — no `Set-Cookie` / `StickinessEnabled == false` — **expected fail** (exercises `ProbeHTTPResponse` cookie parse + optional `GetSessionAffinityConfiguration`).

### CCC.LB.CN06.AR01 — Health-check telemetry alert

- **Requirement**: > When more than 10 percent of targets change from healthy to unhealthy within five minutes, an alert MUST be issued.
- **Disposition**: Not testable (alert delivery + coordinated target failure simulation).

### CCC.LB.CN07.AR01 — Scrub Server header

- **Requirement**: > When responses pass through the load balancer, the "Server" header MUST be replaced with "lb".
- **Disposition**: Behavioural
- **Approach**:
  1. HTTP GET to frontend URL via `ProbeHTTPResponse("{uid}", path)`.
  2. Assert response header `Server: lb` (case per provider normalization).
- **Config**: `lb-frontend-url`, backend returns identifiable Server header pre-LB.
- **v1 cheapest fixture:** L4 pass-through — backend `Server` header unchanged — **expected fail** (exercises `ProbeHTTPResponse` header assert).

### CCC.LB.CN08.AR01 — Automated certificate renewal

- **Requirement**: > When a certificate is within 30 days of expiry, automated renewal MUST complete within 24 hours.
- **Disposition**: Behavioural (partial)
- **Approach**:
  1. Fixture uses **managed / auto-renew** TLS on the HTTPS listener (ACM, App Gateway managed cert, GCP managed SSL certificate).
  2. `GetListenerEncryptionStatus("{uid}")` — extend returns to include `NotBefore`, `NotAfter`, `AgeDays`, `DaysUntilExpiry`, `AutoRenewEnabled` (or `@PerPort` TLS probe to frontend hostname when describe omits leaf cert dates).
  3. Assert `AgeDays ≤ 30` (issued or last renewed within 30 days), `DaysUntilExpiry > 0`, and `DaysUntilExpiry < 30` (within the renewal window per requirement).
  4. Optional: `AutoRenewEnabled == true` / managed cert type when provider exposes it.
- **Feature sketch**:
  - When listener encryption status is retrieved
  - Then certificate age ≤ 30 days
  - And `0 < days until expiry < 30`
- **Config / fixtures**: HTTPS listener with managed cert; prefer short-lived managed certs or a fixture staged in the renewal window so `DaysUntilExpiry < 30` is reachable without waiting a year; `lb-frontend-hostname` for optional TLS probe fallback.
- **Gaps**:
  - Does **not** observe renewal **starting** at the boundary or assert completion within 24 hours (no time travel in CI).
  - Long-lived certs (e.g. 1-year ACM) fail until near expiry unless fixture uses short TTL managed certs.
  - HTTP-only exercise fixture (no TLS) cannot satisfy CN08.
- **v1 cheapest fixture:** HTTP :80 only — no cert metadata — **expected fail** (exercises `GetListenerEncryptionStatus` empty/TLS-off path).

### CCC.LB.CN09.AR01 — Deny management API outside approved CIDR

- **Requirement**: > When an API call originates outside the approved CIDR set, the request MUST be denied.
- **Disposition**: Behavioural
- **Approach**:
  1. Fixture restricts control-plane access via SCP/condition keys/VPC endpoint policy where possible.
  2. `AttemptManagementAPICall("{uid}", "describe")` from runner context — if runner is outside CIDR, expect deny; if runner is inside, use `unauthorized-cidr-simulator` or document AWS/Azure/GCP honesty (condition keys vs actual source IP).
- **Gaps**: True source-IP spoofing is impossible — may use **two test identities** (in-VPC runner vs public) or mark partial cloud support.
- **v1 cheapest fixture:** CIDR policy may not be applied on OOTB LB — **expected fail or inconclusive**; still exercises `AttemptManagementAPICall`.

---

## Cloud-api interface (minimal)

### `load-balancer.Service`

| Method | Used by AR(s) | Args | Returns |
|--------|---------------|------|---------|
| `GenerateClientTrafficBurst` | LB.CN01.AR01 | `lbID`, `clientID string`, `requestCount int` | `ThrottledCount`, `HTTP429Count` |
| `ProbeHTTPResponse` | LB.CN05.AR01, LB.CN07.AR01 | `lbID`, `path string` | `Headers`, `StatusCode`, `Cookies[]` (`Name`, `MaxAgeSeconds`, `Expires`) |
| `GetSessionAffinityConfiguration` | LB.CN05 (optional sanity) | `lbID string` | `StickinessEnabled`, `IdleTimeoutSeconds int` |
| `UpdateRoutingWeights` | LB.CN04.AR01 | `lbID string`, `weights map[string]int` | error |
| `GetListenerEncryptionStatus` | Core.CN02.AR01, LB.CN08.AR01 | `lbID string` | `TLSPolicy`, `MinTLSVersion`, `CertificateARN`, `NotBefore`, `NotAfter`, `AgeDays`, `DaysUntilExpiry`, `AutoRenewEnabled` |
| `AttemptManagementAPICall` | LB.CN09.AR01 | `lbID`, `operation string` | error |

### `logging.Service`

| logType | AR(s) | resourceID |
|---------|-------|------------|
| `access` | CN01.AR02 | LB ARN / name |
| `admin` | CN04.AR01, Core CN04.AR01 | LB resource id |

### `generic.Service` methods used

`GetOrProvisionTestableResources`, `UpdateResourcePolicy`, `TriggerDataRead`, `GetResourceRegion`, `CheckUserProvisioned`, `TearDown`.

---

## Cross-cloud implementation (sketch)

**v1 resource type:** L4 on all clouds (NLB / Standard LB / passthrough NLB). L7 column notes what would be needed for ARs to **pass** later.

| Method | AWS (v1 NLB) | Azure (v1 Standard LB) | GCP (v1 passthrough NLB) |
|--------|--------------|------------------------|--------------------------|
| `GenerateClientTrafficBurst` | TCP flood to listener (no 429 without WAF) | Backend pool flood | Forwarding rule flood |
| `ProbeHTTPResponse` | HTTP GET via NLB → VM (no L7 headers/cookies) | HTTP via L4 → VM | HTTP via L4 → VM |
| `GetSessionAffinityConfiguration` | Target group stickiness (off on v1) | Session persistence N/A on L4 | Backend service affinity N/A |
| `UpdateRoutingWeights` | Target group weights (if supported) | Backend pool rules | Backend service weights |
| `GetListenerEncryptionStatus` | TLS listener describe (none on HTTP v1) | Frontend IP config | Forwarding rule TLS (none on v1) |
| `AttemptManagementAPICall` | `elasticloadbalancing:*` + IAM | `Microsoft.Network/*` ARM | `compute.*` forwarding rules API |

**Pass later (L7 tier):** AWS ALB + WAF; Azure App Gateway + WAF; GCP HTTPS LB + Cloud Armor — enables CN01 throttle, CN05 cookies, CN07 header rewrite, CN08 managed TLS.

---

## Terraform fixtures (v1 — cheapest tier)

| Fixture | Role | Notes |
|---------|------|-------|
| `finos-ccc-integration-lb-main` | L4 LB, HTTP/TCP :80, single backend pool → existing VM | No WAF, logs, stickiness, header policy, or TLS |
| `lb-frontend-url` | NLB/LB DNS or IP for probes | CN05, CN07 |
| `approved-management-cidrs` | Documented for CN09; may be unenforced on v1 | CN09 |

Reuse existing integration VM (`finos-ccc-integration-vm-main` or equivalent) as backend — no dedicated LB backend service.

Submodule: `modules/cloud-api-test/terraform/<cloud>/modules/load-balancer/`.

**Deferred to “passing” tier (not v1):** access log sink, WAF/Cloud Armor, L7 ALB/App Gateway/HTTPS LB, stickiness, `Server: lb` transform, managed HTTPS for CN08.

---

## Integration test coverage (v1)

Integration CSV rows **invoke** methods; Cucumber features assert catalog requirements. On v1 fixtures, behavioural assertions **fail** — that is intentional.

| api | method | cloud | expect_error | arg1 | arg2 | v1 outcome |
|-----|--------|-------|--------------|------|------|------------|
| `load-balancer` | `GetOrProvisionTestableResources` | all | | | | factory wiring |
| `load-balancer` | `CheckUserProvisioned` | all | | main | | describe LB exists |
| `load-balancer` | `ProbeHTTPResponse` | all | | main | `/` | CN05/CN07 — **fail** (no cookie / `Server ≠ lb`) |
| `load-balancer` | `GenerateClientTrafficBurst` | all | | main | `burst-count` | CN01 — **fail** (`HTTP429Count == 0`) |
| `load-balancer` | `GetListenerEncryptionStatus` | all | | main | | CN08/Core CN02 — **fail** (no TLS cert) |
| `load-balancer` | `GetSessionAffinityConfiguration` | all | | main | | CN05 — **fail** (stickiness off) |
| `load-balancer` | `UpdateRoutingWeights` | all | | main | `weights` | CN04 — exercise API (may error on L4) |
| `load-balancer` | `AttemptManagementAPICall` | all | | main | `describe` | CN09 — exercise API |
| `logging` | `QueryLogs` | all | | main | `access`, `60` | CN01.AR02 — **deferred** (no sink) |

### Per-cloud fixture

| Cloud | v1 resource | Backend | ~$/mo |
|-------|-------------|---------|-------|
| **AWS** | **Network Load Balancer** (L4), TCP :80 | Target group → existing integration **VM** IP | **~$16–22** |
| **GCP** | **Regional external passthrough Network LB** (L4) | Backend service → existing integration **VM** | **~$15–20** |
| **Azure** | **Standard Load Balancer** (L4) | Backend pool → existing VM NIC | **~$18–22** |

**Total ~$50–65/mo** (3 clouds, always on). ~10 runs/day adds **&lt; $5/mo**.

| Skip on v1 | Why |
|------------|-----|
| ALB / App Gateway / GCP HTTPS LB | L7 premium; Azure App Gateway **~$100+/mo** alone |
| WAF / Cloud Armor | Rate-limit AR needs extra $ + config |
| Access log sink | CN01.AR02 deferred |
| Stickiness, header rewrite, managed HTTPS | L7-only; failures demonstrate OOTB gap |

Unhealthy VM targets are acceptable — describe/admin SDK paths still run against a real LB resource id.

---

## Open questions

- CN09: which clouds support honest “outside CIDR” API deny from the integration runner without a second in-VPC agent?
- CN01 scale-down: threshold **configurable in privateer / test config** when WAF tier is added (resolved for v1 — no WAF, burst still runs).

## Decisions (closed)

| Topic | Decision |
|-------|----------|
| v1 LB type | **L4 cheapest** — AWS NLB, GCP passthrough NLB, Azure Standard LB |
| Pass vs exercise | **Exercise + expected behavioural failures** on OOTB fixtures |
| README `@load-balancer` routing | No change to [modules/features/README.md](../README.md) in this phase |

---

## Review checklist

- [x] All nine native ARs listed (CN01.AR01–AR02, CN02.AR01, CN04.AR01, CN05.AR01, CN06.AR01, CN07.AR01, CN08.AR01, CN09.AR01)
- [x] CN02, CN06 marked Not testable; CN08 partial behavioural (cert age + renewal window)
- [x] v1 cheapest L4 fixture + expected-fail matrix documented
- [x] Seven Core imports in reuse table
- [x] `@PerPort` noted for Core CN01 (deferred on HTTP-only v1)
- [x] Interface + logging + fixtures planned
- [x] Only `analysis.md` in this phase
