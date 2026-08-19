# Behavioural test analysis: Managed Kubernetes

- **Catalog**: `catalogs/orchestration/k8s/controls.yaml`
- **Catalog id**: `CCC.K8S`
- **Features root**: `modules/features/kubernetes/`
- **Shared features root**: `modules/features/generic/` (primary source for inherited Core)
- **Cloud-api package**: `modules/cloud-api/kubernetes/` (new)
- **Factory service id**: `kubernetes`
- **Date**: 2026-07-30

## Summary

The Managed Kubernetes catalog defines **18 native controls** with **41 assessment requirements**, plus **nine imported CCC.Core controls** (CN01, CN02, CN03, CN04, CN05, CN06, CN07, CN09, CN13). CSP surfaces are **EKS / AKS / GKE**.

Of the 41 native ARs, roughly **29 are Behavioural** (admit/deny probes, endpoint exposure, inventory assertions, network-flow probes), **~10 are `@NotTestable` or Policy-deferred** (entitlement inventories, addon allowlist enforcement, alert delivery, cross-account log isolation, update-channel timing, PV rebind sanitization, signing/vuln-scan prerequisites), and Core reuse covers MFA / enumeration / log-integrity stubs plus PerPort TLS and region checks.

**Most inherited Core ARs reuse `modules/features/generic/`** (and `vpc/` for CN06) by adding `@kubernetes` — do not copy those files into `kubernetes/CCC.Core/`. Native ARs and Core CN02 (cluster encryption-at-rest) need **new** features under `kubernetes/CCC.K8S/` and one Core CN02 file. Planned APIs: **25 Kubernetes methods + one fixture-control method** (+ `generic.Service` + `logging.Service` + shared `reachability.Prober`), dominated by a shared `AttemptAdmitWorkload` reused for admission/PSS/image/resource/quota/governance ARs. CN11.AR03 additionally plans a standalone `admission-webhook-probe` module and a narrow `admissionwebhook.Service` that toggles only that probe's backend.

**Runner note (implementation skill):** extend `collectFeaturePaths` so `kubernetes` loads `port/` (API TLS / CN01+CN13) and `vpc/` (CN06), matching VM/serverless patterns.

## Feature reuse from generic

| Core control | Generic (or shared) feature | Action for this service |
|--------------|----------------------------|-------------------------|
| CN01.AR01/AR02/AR03/AR07/AR08 | `generic/CCC.Core/CCC-Core-CN01-AR*.feature` | Add `@kubernetes` on `@PerPort` scenarios; privateer `host-name` = API endpoint hostname, `port-number` = `443` |
| CN03.AR01 | `generic/CCC.Core/CCC-Core-CN03-AR01.feature` | Add `@kubernetes` to `@NotTestable` |
| CN04.AR01 | `generic/CCC.Core/CCC-Core-CN04-AR01.feature` | Add `@kubernetes`; `{service-type}` + `UpdateResourcePolicy` + `logging.QueryLogs` |
| CN04.AR02 | `generic/CCC.Core/CCC-Core-CN04-AR02.feature` | Add `@kubernetes`; `TriggerDataWrite` (kubectl mutate / tag flip) |
| CN04.AR03 | `generic/CCC.Core/CCC-Core-CN04-AR03.feature` | Add `@kubernetes`; `TriggerDataRead` |
| CN05.AR06 | `generic/CCC.Core/CCC-Core-CN05-AR06.feature` | Add `@kubernetes`; identity-scoped `TriggerDataRead` — extend same file for write/admin deny via `TriggerDataWrite` / `UpdateResourcePolicy` |
| CN06.AR01 | `vpc/CCC.Core/CCC-Core-CN06-AR01.feature` | Add `@kubernetes`; `GetResourceRegion` |
| CN07.AR01 / AR02 | `generic/CCC.Core/CCC-Core-CN07-AR0*.feature` | Add `@kubernetes` to `@NotTestable` |
| CN10.AR01 | `generic/CCC.Core/CCC-Core-CN10-AR01.feature` | Add `@kubernetes` to `@NotTestable` (replication perimeter N/A at cluster layer; stub only) |
| CN09.* | — (no generic feature yet) | Plan `@NotTestable` stub under `generic/` when centralized; until then document only |
| CN13.* | No dedicated feature yet | Prefer extending `@PerPort` cert checks with `@kubernetes` when CN13 scenarios land in `generic/` or `port/` |

**New-only ARs (native + Core that generic cannot cover):**

| AR | Planned feature path | Why not generic-only |
|----|----------------------|----------------------|
| All `CCC.K8S.CN*.AR*` (behavioural) | `kubernetes/CCC.K8S/<AR-id>.feature` | Service-specific cloud-api methods / kubectl admission probes |
| CCC.Core.CN02.AR01 | `kubernetes/CCC.Core/CCC-Core-CN02-AR01.feature` | Needs `GetEncryptionAtRestStatus` (etcd / secrets encryption) — not on `generic.Service` |

Do **not** create `kubernetes/CCC.Core/` copies of CN01, CN03, CN04, CN05, CN06, CN07, or CN10.

## Imported controls

| Reference | Action |
|-----------|--------|
| CCC.Core.CN01 | Reuse `generic/…/CCC-Core-CN01-AR*.feature`; add `@kubernetes`; API server HTTPS on 443 |
| CCC.Core.CN02 | **New** feature — `GetEncryptionAtRestStatus` on managed cluster secrets/etcd encryption |
| CCC.Core.CN03 | Reuse generic `@NotTestable` — MFA is IdP/console, not cluster API |
| CCC.Core.CN04 | Reuse generic CN04 — implement `UpdateResourcePolicy`, `TriggerDataWrite`, `TriggerDataRead` on kubernetes service |
| CCC.Core.CN05 | Extend generic CN05 with `@kubernetes` + identity-scoped mutate/read |
| CCC.Core.CN06 | Reuse `vpc/…/CCC-Core-CN06-AR01.feature`; add `@kubernetes` |
| CCC.Core.CN07 | Reuse generic `@NotTestable` |
| CCC.Core.CN09 | `@NotTestable` — log sink isolation / immutability needs org-policy proofs |
| CCC.Core.CN13 | PerPort certificate lifetime on API endpoint when scenarios exist; otherwise `@NotTestable` stub until generic CN13 features land |

---

## Assessment requirements

### CCC.K8S.CN01.AR01 — Restrict API to approved networks

- **Requirement**: > When a Kubernetes API endpoint is active, its network access configuration MUST restrict inbound traffic to explicitly approved private networks or source address ranges.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear, tlp-green, tlp-amber, tlp-red
- **Reuse**: New under `kubernetes/CCC.K8S/`
- **Interpretation**: Managed API endpoint (EKS public/private access, AKS API server authorized IP ranges / private cluster, GKE authorized networks / private endpoint) must encode an allowlist; traffic from outside that allowlist must fail.
- **Approach**:
  1. Good fixture: private or CIDR-restricted API endpoint; privateer `approved-api-cidrs`.
  2. `GetAPIEndpointConfig` → assert `PublicAccess=false` **or** non-empty `AllowedCIDRs` matching config.
  3. `AttemptAPIEndpointReachability` resolves the cluster endpoint, then delegates a TLS probe to `reachability.Prober` in `modules/cloud-api/reachability/`.
  4. For `networkContext=untrusted`, the client calls the separately deployable FINOS `modules/probes/reachability/` service. That service runs outside the integration CSP estates and attempts the TLS connection from its own known public egress. The expected result is `TCPConnected=false`; an HTTP `401`/`403` still proves that the API endpoint was network-reachable and therefore fails this AR.
  5. Correlate the remote observation with `GetAPIEndpointConfig`; a timeout alone means “unreachable from this observer”, not necessarily “the allowlist denied it”.
- **Feature sketch**: Background cloud api + `kubernetes`; assert endpoint configuration; request an authenticated remote probe from the FINOS untrusted observer; assert the API endpoint is not TCP/TLS reachable.
- **Config / fixtures**: `resource` = cluster name; `approved-api-cidrs`; `reachability-probe-mode=remote`; `reachability-probe-url`; secret-expanded `reachability-probe-shared-secret`; expected `reachability-probe-observer`. The shared secret comes from FINOS secret storage / CI secrets and MUST NOT be committed or emitted as a terraform output.
- **Gaps / honesty notes**: The FINOS probe service is an independently deployed prerequisite, not part of the EKS/AKS/GKE integration rollouts. DNS failure and probe-service failure are inconclusive infrastructure errors, not compliance passes. Config-only assertion remains a weaker `@SANITY` fallback when the remote service is unavailable.
- **New component required**:
  - `modules/cloud-api/reachability/`: shared request/result contract plus local and authenticated HTTP client implementations.
  - `modules/probes/reachability/`: separate Go module and deployable server for the FINOS estate; add it to `modules/go.work` during implementation. It executes tightly constrained DNS/TCP/TLS probes and returns observation evidence.
  - Authenticate requests with an HMAC-SHA256 signature over timestamp, nonce, and request body using the shared secret; reject stale/replayed requests. The service MUST also enforce target/port allowlists, resolve and validate every destination IP, reject loopback/link-local/metadata/private ranges unless explicitly approved, rate-limit callers, and audit requests to avoid becoming an SSRF/network-scanning service.

### CCC.K8S.CN01.AR02 — Disable public API access

- **Requirement**: > When a Kubernetes API endpoint is active, public network access to that endpoint MUST be disabled.
- **Disposition**: Behavioural
- **Applicability**: tlp-amber, tlp-red
- **Reuse**: New under `kubernetes/CCC.K8S/`
- **Interpretation**: Stricter than AR01 — public endpoint flag must be off (private cluster / private endpoint only).
- **Approach**:
  1. `GetAPIEndpointConfig` → assert `PublicAccess=false` and a private endpoint is present.
  2. Reuse `AttemptAPIEndpointReachability(clusterID, "untrusted")`, backed by the FINOS `reachability-probe`, to attempt a TLS connection from outside the integration estates.
  3. Assert `TCPConnected=false`. A completed TLS handshake or HTTP `401`/`403` means the endpoint is publicly network-reachable and fails AR02.
  4. Correlate both observations: `PublicAccess=false` plus external unreachability is the pass condition; probe-service errors are infrastructure failures rather than compliance passes.
- **Config / fixtures**: Good fixture always private; `finos-ccc-integration-k8s-bad` supplies the public-endpoint negative case. Reuse AR01's `reachability-probe-url`, secret-expanded `reachability-probe-shared-secret`, expected observer, and timeout.
- **Gaps / honesty notes**: AKS “authorized IP ranges” with public FQDN still has a public endpoint — that pattern fails AR02 even if AR01 passes. External DNS failure is supporting evidence only and must be paired with `PublicAccess=false`.

### CCC.K8S.CN02.AR01 — Least-privilege access bindings

- **Requirement**: > When a user or group is granted cluster access, each cloud access binding and Kubernetes role binding MUST grant only an approved role required by that identity's documented responsibilities.
- **Disposition**: Policy-deferred / `@NotTestable` in CI
- **Applicability**: tlp-clear … tlp-red
- **Interpretation**: Requires an organization entitlement inventory (“approved role for responsibility”) that CI does not own.
- **Approach**: Document only; optional future `@OPT_IN` compare of bindings to privateer `approved-entitlements` file if orgs supply one.
- **Gaps / honesty notes**: Do not fake “least privilege” by asserting absence of `cluster-admin` alone.

### CCC.K8S.CN02.AR02 — No wildcard non-system roles

- **Requirement**: > When a non-system Kubernetes role is defined, it MUST NOT grant wildcard verbs or wildcard resources AND any access to secrets, role bindings, admission configuration, or node proxy functions MUST enumerate the required verbs and resource names.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Reuse**: New under `kubernetes/CCC.K8S/`
- **Approach**: `GetRBACPolicyFindings` → `WildcardRoles` empty for non-system; sensitive resources use enumerated `resourceNames` / verbs (no `*` on secrets / rolebindings / validatingwebhookconfigurations / nodes/proxy).
- **Config / fixtures**: Cluster with PSS/Kyverno/Gatekeeper optional; baseline Roles without wildcards. System roles (`system:`, `kube-system`) excluded via config `system-role-prefixes`.
- **Gaps / honesty notes**: Does not prove cloud IAM (EKS access entries / AKS AAD roles) least privilege — that remains AR01.

### CCC.K8S.CN03.AR01 — Workload identity federation

- **Requirement**: > When a workload accesses a cloud API, its Kubernetes service account MUST be bound to a dedicated cloud identity that issues short-lived credentials through workload identity federation.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Reuse**: New under `kubernetes/CCC.K8S/`
- **Interpretation**: The good path proves federation is present for a designated workload SA. A **negative** path proves an unbound SA is *not* federated and cannot obtain usable cloud credentials — without that, a green `Federated=true` alone can false-pass.
- **Approach**:
  1. **Fixture (main cluster)**: two ServiceAccounts in `test-workload-namespace`:
     - `test-workload-service-account` — annotated for IRSA / AKS Workload Identity / GKE Workload Identity and bound to a dedicated cloud identity.
     - `test-workload-service-account-unbound` — same namespace, **no** federation annotations / federated credential (negative control).
  2. **Positive (`@MAIN`)**: `GetWorkloadIdentityStatus(cluster, ns, bound-sa)` → `Federated=true`, `CloudIdentityID` non-empty, `LongLivedKeysPresent=false`.
  3. **Negative — status (`@MAIN`)**: `GetWorkloadIdentityStatus(cluster, ns, unbound-sa)` → `Federated=false` and empty `CloudIdentityID`.
  4. **Negative — live cloud call (`@OPT_IN` / integration CSV)**: `AttemptCloudAPIAsWorkload(cluster, ns, unbound-sa, action)` (e.g. list a tagged bucket / describe a tagged resource that only the bound identity may access) → access denied / no usable token. Optional `@SANITY`: same call with the **bound** SA succeeds.
- **Feature sketch**:
  - Scenario A: bound SA reports federated.
  - Scenario B: unbound SA reports not federated.
  - Scenario C (`@OPT_IN`): unbound SA cloud API attempt fails; bound SA succeeds.
- **Config / fixtures**: `test-workload-namespace`, `test-workload-service-account`, `test-workload-service-account-unbound`; optional `wi-probe-resource` (cloud resource the bound role can read). Do **not** put long-lived keys on the unbound SA — that belongs to CN03.AR02.
- **Gaps / honesty notes**: Status checks alone do not prove token minting works; Scenario C closes that gap but needs a disposable probe Job and a narrowly scoped cloud role. Least-privilege of the bound role remains CN17.

### CCC.K8S.CN03.AR02 — No long-lived cloud credentials in workloads

- **Requirement**: > When workload identity federation is enabled, workload specifications and Kubernetes configuration objects MUST NOT contain long-lived cloud access keys, client secrets, or service-account key files.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Reuse**: New under `kubernetes/CCC.K8S/`
- **Approach**:
  1. **Inventory (`@MAIN`)**: `FindStaticCloudCredentials` scans Pods/Deployments/Secrets/ConfigMaps in the test namespace for known key patterns (AWS access key id, Azure client secret env vars, GCP SA JSON) → empty `Findings`.
  2. **Admission deny (`@MAIN`)**: `AttemptAdmitWorkload` with a manifest that embeds a synthetic long-lived cloud credential (env var / Secret / mounted key file pattern) → `Denied=true`. Fixture must enforce an admission policy that blocks static cloud credentials (Kyverno/Gatekeeper/Azure Policy equivalent).
  3. **Sanity (`@OPT_IN`)**: admit an otherwise-identical manifest **without** static credentials → `Admitted=true` (proves the policy is specific, not a blanket deny).
- **Feature sketch**:
  - Scenario A: test namespace has no static cloud credentials.
  - Scenario B: workload with injected static key is denied at admission.
  - Scenario C (`@OPT_IN`): clean workload is admitted.
- **Config / fixtures**: `test-workload-namespace`; admission policy on the main fixture that rejects static cloud credential patterns; sample deny manifest supplied by the feature or as a privateer file path.
- **Gaps / honesty notes**: Heuristic scan is not a full secret-scanner — obfuscated values can false-negative on Scenario A; Scenario B is the stronger behavioural proof. Do not use real secrets in the deny probe — synthetic well-known patterns only.

### CCC.K8S.CN04.AR01 — Approved registry + immutable digest

- **Requirement**: > When a workload is admitted, every container image MUST originate from an approved registry AND be referenced by an immutable digest.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Reuse**: New under `kubernetes/CCC.K8S/`
- **Approach**: `AttemptAdmitWorkload` with (a) tag-only image from unapproved registry → denied; (b) digest from `approved-registries` → admitted (`@OPT_IN` sanity).
- **Config / fixtures**: Admission policy (Kyverno/Gatekeeper/Azure Policy) on fixture cluster; `approved-registries`; sample digests.
- **Gaps / honesty notes**: Requires policy engine on fixture — without it mark scenario blocked / `@NotTestable` for that cloud until terraform enables policy.

### CCC.K8S.CN04.AR02 — Signature and provenance verification

- **Requirement**: > When a container image is admitted, its signature and provenance attestation MUST be verified against an approved publisher and build process.
- **Disposition**: Behavioural **with prerequisites**; otherwise `@NotTestable`
- **Applicability**: tlp-green, tlp-amber, tlp-red
- **Approach**: `AttemptAdmitWorkload` with an unsigned / unattested image → `Denied=true`; `AttemptAdmitWorkload` with a cosign-signed image from an approved publisher → `Admitted=true` (`@OPT_IN`). Needs signing keys / verification policy in terraform.
- **Gaps / honesty notes**: Many org clusters lack Sigstore enforcement in CI — honest default is `@NotTestable` until fixture documents signed-image pipeline.

### CCC.K8S.CN04.AR03 — Deny critically vulnerable images

- **Requirement**: > When a container image contains a known critical vulnerability, admission of that image MUST be denied.
- **Disposition**: Behavioural **with prerequisites**; otherwise `@NotTestable`
- **Applicability**: tlp-green, tlp-amber, tlp-red
- **Approach**: Pre-scanned known-critical image digest in privateer vars; `AttemptAdmitWorkload` → denied.
- **Gaps / honesty notes**: Depends on continuous scanner integration (AWS Inspector / Defender / Artifact Analysis) wired to admission — often unavailable in shared CI.

### CCC.K8S.CN05.AR01 — Deny privileged / host-access workloads

- **Requirement**: > When a workload is admitted, it MUST NOT request privileged execution, privilege escalation, host PID, host IPC, host networking, unrestricted host paths, or additional Linux capabilities.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Reuse**: New — `AttemptAdmitWorkload` with privileged/host* pod → denied (Restricted PSS / equivalent).
- **Config / fixtures**: Namespace labeled for Restricted PSS or equivalent validating policy.
- **Gaps / honesty notes**: System namespaces with different policies are covered under CN11.AR01, not this AR.

### CCC.K8S.CN05.AR02 — Non-root, seccomp, drop capabilities

- **Requirement**: > When a Linux workload is admitted, each container MUST run as a non-root user, use the runtime-default seccomp profile, disable privilege escalation, and drop all Linux capabilities without adding capabilities back to the container.
- **Disposition**: Behavioural
- **Applicability**: tlp-green, tlp-amber, tlp-red
- **Reuse**: New under `kubernetes/CCC.K8S/`
- **Interpretation**: Admission deny of insecure specs is necessary but not sufficient — the AR is about what the **running** container actually is. Prove both: bad manifests are rejected, and an admitted compliant probe reports a non-root UID, dropped capabilities, and runtime-default seccomp.
- **Approach**:
  1. **Deny (`@MAIN`)**: `AttemptAdmitWorkload` omitting `runAsNonRoot` / seccomp, or with added capabilities → `Denied=true`.
  2. **Runtime evidence (`@MAIN`)**: `AttemptAdmitWorkload` (or create) a short-lived compliant probe Job/Pod whose command prints process identity (e.g. `id -u`, `id -g`, effective capabilities, seccomp mode from `/proc/self/status`). Then `GetWorkloadRuntimeSecurity(cluster, podSelector)` reads those logs (preferred) or a single `kubectl exec`-equivalent and returns structured fields.
  3. Assert `UID > 0`, `AllowPrivilegeEscalation=false` (from pod securityContext), `CapabilitiesEmpty=true` (or CapEff all-zero), `SeccompProfile=RuntimeDefault` (from securityContext and/or `Seccomp:` in `/proc/self/status`).
  4. Tear down the probe workload in `TearDown` / method cleanup.
- **Feature sketch**:
  - Scenario A: insecure Linux securityContext denied at admission.
  - Scenario B: compliant probe runs and reports non-root + dropped caps + runtime-default seccomp.
- **Config / fixtures**: Restricted PSS (or equivalent) on `test-workload-namespace`; approved probe image (digest-pinned); optional `security-probe-image`.
- **Gaps / honesty notes**: Windows containers out of scope. Prefer log scrape over exec so the test identity need not have `pods/exec`. Procfs seccomp field numbering differs by kernel — map in the cloud-api implementation and document. Admission alone remains Scenario A; Scenario B is what makes the AR behavioural.

### CCC.K8S.CN06.AR01 — Default-deny NetworkPolicy

- **Requirement**: > When a user workload namespace is created, an enforced network policy MUST deny all ingress and egress traffic by default.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Interpretation**: NetworkPolicy object presence is configuration evidence only. The dataplane must demonstrably block both directions for a workload selected by the default-deny policies.
- **Approach**:
  1. **Configuration (`@MAIN`)**: `GetNamespaceNetworkPolicyStatus` on the user namespace → `DefaultDenyIngress=true`, `DefaultDenyEgress=true`, and `PolicyCapable=true`.
  2. **Egress enforcement (`@MAIN`)**: start an isolated probe pod in `test-workload-namespace`; `AttemptWorkloadNetworkFlow` from that pod to a reachable control listener outside the namespace → `Connected=false`.
  3. **Ingress enforcement (`@MAIN`)**: start a listener pod in the isolated namespace; `AttemptWorkloadNetworkFlow` from a control probe outside the namespace to that listener → `Connected=false`.
  4. **Positive control (`@MAIN`)**: run the same probe between control pods on an explicitly allowed path → `Connected=true`, proving failures above are caused by policy rather than a broken listener, DNS, or probe harness.
  5. Clean up short-lived probe pods/services in `TearDown`.
- **Feature sketch**:
  - Scenario A: default-deny ingress/egress policies are present.
  - Scenario B: isolated workload cannot initiate egress.
  - Scenario C: outside workload cannot initiate ingress.
  - Scenario D: equivalent explicitly allowed control flow succeeds.
- **Config / fixtures**: Namespace provisioned with default-deny policies; `test-workload-namespace`; separate `network-control-namespace`; digest-pinned probe/listener image; `network-probe-port` and protocol.
- **Gaps / honesty notes**: This proves enforcement for the fixture CNI and selected pod paths, not every node/interface. Prefer short-lived Jobs/Pods that publish structured results/logs over granting broad `pods/exec`.

### CCC.K8S.CN06.AR02 — Explicit allow policies

- **Requirement**: > When communication is required, each allow policy MUST identify the approved source, destination, protocol, and port using stable namespace, workload, or network selectors.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Interpretation**: Default-deny (AR01) is the base. Explicit allow policies must name stable selectors for source, destination, protocol, and port — and the dataplane must permit only those destinations.
- **Approach**:
  1. Fixture NetworkPolicy (or equivalent) allows the probe workload to reach a small allowlist of destinations (host/FQDN or CIDR + protocol + port) using stable namespace/pod/network selectors.
  2. **Allowlisted URL/host (`@MAIN`)**: from the probe pod, `AttemptWorkloadNetworkFlow` (or HTTPS HEAD/GET) to each entry in `network-allowlist-urls` → `Connected=true` / success.
  3. **Non-allowlisted URL/host (`@MAIN`)**: same probe to each entry in `network-denylist-urls` (reachable in the control namespace, but not named by the allow policy) → `Connected=false`.
  4. Prefer concrete FQDNs or ClusterIP/Service DNS names over ephemeral pod IPs so selectors stay stable across runs. External URLs (e.g. `https://registry.example.com`) are fine when the allow policy uses egress CIDR/FQDN/port rules the CNI supports.
  5. Clean up short-lived probe pods in `TearDown`.
- **Feature sketch**:
  - Scenario A: allowlisted destination(s) succeed from the constrained workload.
  - Scenario B: denylisted / unspecified destination(s) fail from the same workload.
- **Config / fixtures**: Same probe image/port vars as AR01; `network-allowlist-urls` (e.g. `http://ccc-allowed.ccc-network-control.svc:8080/health`); `network-denylist-urls` (e.g. `http://ccc-denied.ccc-network-control.svc:8080/health`, optional external URL). Control namespace hosts both listeners; only the allowlisted Service is selected by the NetworkPolicy.
- **Gaps / honesty notes**: FQDN-based egress policies are CNI/provider-specific (some need DNS-aware policies or IP allowlists after resolve). Document which selector style the fixture uses. Do not treat HTTP 403 from an application as “network denied” — require connection timeout / refused / policy drop.

### CCC.K8S.CN07.AR01 — Protect secret material

- **Requirement**: > Secret material used by a workload MUST be encrypted during storage and delivery, MUST be accessible only to the intended workload identity, and MUST NOT be embedded in a container image or non-secret configuration resource.
- **Disposition**: Behavioural
- **Applicability**: tlp-green, tlp-amber, tlp-red
- **Interpretation**: Three checks: (a) at-rest encryption enabled; (b) the secret is **actually** readable only by the intended workload identity — proven by live authorized vs unauthorized access, not just role inspection; (c) the secret value is not sitting in an image or ConfigMap.
- **Approach**:
  1. **At-rest (`@MAIN`)**: `GetEncryptionAtRestStatus` → secrets/etcd encryption enabled (overlaps Core CN02).
  2. **Authorized access (`@MAIN`)**: `AttemptSecretAccessAsIdentity(cluster, ns, secretName, intended-sa, "get")` → `Allowed=true` and the returned value/version matches the fixture. This is the "delivered to the intended workload" half.
  3. **Unauthorized access (`@MAIN`, negative)**: `AttemptSecretAccessAsIdentity(cluster, ns, secretName, "test-workload-service-account-unbound", "get")` (or a second SA without a RoleBinding) → `Denied=true`, no secret material returned.
  4. **No plaintext leakage (`@MAIN`)**: `FindStaticCloudCredentials` + ConfigMap scan in the test namespace → the secret value does not appear in any ConfigMap / env / image layer.
- **Feature sketch**:
  - Scenario A: secrets encryption enabled.
  - Scenario B: intended SA reads the secret.
  - Scenario C: unauthorized SA is denied.
  - Scenario D: secret value absent from ConfigMaps/images.
- **Config / fixtures**: `test-workload-namespace`, `test-workload-service-account` with a RoleBinding to `get` the named secret, an unauthorized SA without it; fixture secret name in `protected-secret-name`.
- **Gaps / honesty notes**: “Encrypted during delivery” (in-transit to kubelet) is largely a CSP default — assert at-rest + identity-scoped access + no plaintext, not wire encryption. Access uses `SelfSubjectAccessReview`/impersonation or a per-SA token so the test identity itself need not hold broad secret read.

### CCC.K8S.CN07.AR02 — Narrow secret RBAC

- **Requirement**: > When Kubernetes secret access is granted, workload roles MUST be limited to the required named secrets and MUST NOT grant unrestricted list or watch access.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Interpretation**: A workload SA that legitimately needs one secret may `get` that **named** secret, but must not read a sibling secret or enumerate/watch the namespace's secrets. Inspecting the Role is useful corroboration; live requests using the SA are the behavioural proof.
- **Approach**:
  1. **Fixture**: create `protected-secret-name` and `unrelated-secret-name` in `test-workload-namespace`. Bind `test-workload-service-account` to a Role with `resources: [secrets]`, `resourceNames: [protected-secret-name]`, `verbs: [get]`. Do not grant `list` or `watch`.
  2. **Required named secret (`@MAIN`)**: `AttemptSecretAccessAsIdentity(..., protected-secret-name, intended-sa, "get")` → `Allowed=true`.
  3. **Different named secret (`@MAIN`, negative)**: the same SA calls `get` for `unrelated-secret-name` → `Denied=true`.
  4. **List (`@MAIN`, negative)**: the same SA calls `list` with no secret name → `Denied=true`; receiving an empty list still counts as **allowed** and therefore fails the AR.
  5. **Watch (`@MAIN`, negative)**: the same SA starts `watch` with a short context timeout → authorization must fail immediately. A successfully established watch, even with zero events, fails the AR.
  6. **Corroboration (`@MAIN`)**: `GetRBACPolicyFindings` → `OverbroadSecretAccess` empty, confirming no non-system workload Role has unrestricted secret `list`/`watch`.
- **Feature sketch**:
  - Scenario A: intended SA gets its named secret.
  - Scenario B: intended SA cannot get a different secret.
  - Scenario C: intended SA cannot list secrets.
  - Scenario D: intended SA cannot watch secrets.
- **Config / fixtures**: `test-workload-namespace`, `test-workload-service-account`, `protected-secret-name`, `unrelated-secret-name`, `secret-watch-timeout-ms`.
- **Implementation notes**: Mint a short-lived projected token using Kubernetes `TokenRequest` for the named fixture SA, then issue the real API operation with a client built from that token. Restrict the test runner's token-mint permission to the two fixture SAs/namespace. Never attach secret plaintext to reports; compare a fixture digest internally and return only `ValueMatched`.
- **Gaps / honesty notes**: Cluster-admin and system-controller roles are excluded from inventory findings via configured prefixes, but the live probes always run as the fixture workload SA. Kubernetes `resourceNames` does not safely make unrestricted `list`/`watch` acceptable; this plan requires those verbs to be absent.

### CCC.K8S.CN08.AR01 — Addon allowlist

- **Requirement**: > When a CSP-provided cluster add-on, extension, or managed feature is enabled, it MUST be included in an organization-controlled allowlist.
- **Disposition**: `@NotTestable` (Policy-deferred)
- **Applicability**: tlp-clear … tlp-red
- **Why not behavioural**: The control is about an **organization-controlled** allowlist and enforcement of enablement. An honest behavioural test would need to *attempt* to enable a non-allowlisted addon/extension and observe a **deny**. Only some clouds provide that enforcement path (e.g. Azure Policy on AKS extensions); AWS EKS and GCP GKE generally lack a first-class "reject unknown addon" API, so enablement succeeds and any allowlist reconciliation is asynchronous/out-of-band. A `GetClusterComponentInventory ⊆ addon-allowlist` check only compares the cluster to a list supplied in Privateer config — it verifies the fixture, not that the organization controls enablement, so it is not an honest `@MAIN` behavioural signal.
- **Optional corroboration (`@OPT_IN`)**: `GetClusterComponentInventory` → enabled addons ⊆ `addon-allowlist` as a **configuration** sanity check, explicitly not treated as behavioural proof.
- **Future behavioural path**: where a cloud supports deny-on-enable (Azure Policy / GKE Policy Controller / org policy), add `AttemptEnableAddon(name) → Denied` for a known-disallowed addon and reclassify per-cloud.
- **Gaps / honesty notes**: Org allowlist is config input — the list's correctness and its enforcement are organizational/policy controls outside single-run CI. `GetClusterComponentInventory` is still implemented for CN09 (version/support), so no method is removed.

### CCC.K8S.CN09.AR01 — Supported control-plane / worker versions

- **Requirement**: > When a cluster is operational, its Kubernetes control-plane version, worker version, node image, and container runtime MUST remain within the CSP's current support lifecycle.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Approach**: `GetClusterComponentInventory` / support fields → `ControlPlaneInSupport`, `WorkersInSupport`, `NodeImageInSupport` true. Compare to CSP support APIs or privateer `min-supported-version` floor when live calendars are unavailable.
- **Gaps / honesty notes**: Use live provider support APIs

### CCC.K8S.CN09.AR02 — Security updates via supported mechanism

- **Requirement**: > Managed cluster components and worker-node images MUST incorporate published security updates through a supported update or replacement mechanism.
- **Disposition**: `@NotTestable` in CI
- **Applicability**: tlp-green, tlp-amber, tlp-red
- **Interpretation**: Proves an update *mechanism* and that updates are applied — one-shot CI cannot wait for vendor patches.
- **Approach**: Stub `@NotTestable`; optional future assert that auto-upgrade channel / node-image auto-repair is **configured** (weaker than AR text).

### CCC.K8S.CN09.AR03 — Addon version compatibility

- **Requirement**: > When a cluster add-on or extension is installed, its version MUST be compatible with the active Kubernetes version and remain supported by its publisher.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Interpretation**: Unlike CN08 (which addons may be *enabled* — `@NotTestable`), this AR asks whether each **installed** CSP addon/extension is on a **compatible and still-supported version** for the cluster's Kubernetes release. That is observable from CSP addon APIs without needing an org allowlist.
- **Approach**:
  1. `GetClusterComponentInventory` → read `ControlPlaneVersion` and every CSP-managed addon/extension currently installed (`Name`, `Version`, `Publisher`).
  2. For each addon, query the CSP compatibility/support surface (same call or follow-up) and populate `CompatibleWithControlPlane` and `PublisherSupported` (or equivalent: installed version ∈ CSP-advertised compatible versions for this Kubernetes minor).
  3. Assert every installed addon has `Compatible=true` and `PublisherSupported=true`. Any addon with `health=DEGRADED` due to version mismatch, or a version the CSP marks deprecated/unsupported for this control plane, fails.
  4. Scope is **CSP addon/extension APIs only** (EKS Addons, AKS addon profiles/extensions, GKE managed addons) — not arbitrary Helm charts.
- **Feature sketch**:
  - Scenario A (`@MAIN`): inventory non-empty (or empty if fixture has only default managed components — still assert each entry passes).
  - Scenario B (`@MAIN`): every inventoried addon reports compatible + publisher-supported for the active control-plane version.
- **Config / fixtures**: Main fixture keeps addons on CSP-default or explicitly compatible channels; no Privateer allowlist required for pass/fail (optional `addon-inventory-include` filter if some system extensions should be ignored).
- **Cross-cloud notes**:
  - **AWS**: `eks:ListAddons` + `DescribeAddon` / `DescribeAddonVersions` filtered by cluster Kubernetes version — installed `addonVersion` must appear in compatible versions.
  - **Azure**: AKS addon profiles + managed cluster extensions APIs; compare addon version to AKS support matrix for the cluster's Kubernetes version.
  - **GCP**: GKE `addonsConfig` / release channel; assert managed addons track a channel that CSP documents as compatible with `currentMasterVersion`.
- **Gaps / honesty notes**: Third-party Helm charts outside CSP addon APIs are out of scope unless explicitly listed in inventory config. CSP "compatible" ≠ CVE-free; security updates remain CN09.AR02 (`@NotTestable`). Empty inventory (no optional addons) is a pass for this AR if the CSP reports no managed addons beyond the control plane.

### CCC.K8S.CN10.AR01 — PVC matches storage policy

- **Requirement**: > When a persistent volume claim is created, its namespace, storage class, access mode, and requesting service account MUST match an approved workload storage policy.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Interpretation**: Prove the policy both **blocks** non-conforming claims and **permits** conforming ones — a deny-only test can be satisfied by a broken/misconfigured StorageClass, and a bind-only test proves nothing about enforcement.
- **Approach** (both directions, both `@MAIN`):
  1. **Negative (`@MAIN`)**: `AttemptCreatePVC` with a claim that violates the policy — disallowed StorageClass (and/or disallowed accessMode, e.g. `ReadWriteMany` where not approved) in `test-workload-namespace` → `Denied=true`, `Created=false`.
  2. **Positive (`@MAIN`)**: `AttemptCreatePVC` with a compliant claim — approved StorageClass + accessMode + requesting SA → `Created=true` and the claim reaches `Bound` (or `Pending`→`Bound` within a bounded wait for dynamic provisioning).
  3. **Cleanup**: delete both test PVCs (and any provisioned PV) in `TearDown`; use unique claim names per run (`{timestamp}`).
  4. Optionally repeat the negative for a **wrong namespace** or **wrong SA** when the policy keys on those, to cover the full "namespace, storage class, access mode, and requesting service account" clause.
- **Feature sketch**:
  - Scenario A: disallowed StorageClass PVC is denied.
  - Scenario B: disallowed accessMode PVC is denied.
  - Scenario C: compliant PVC is created and binds.
- **Config / fixtures**: `approved-storage-classes`, `disallowed-storage-class`, `approved-access-mode`, `disallowed-access-mode`; admission policy (Kyverno/Gatekeeper/Azure Policy) or StorageClass RBAC restriction on the main fixture; test SA. Bad path must fail at admission/authorization, not merely stay `Pending`.
- **Gaps / honesty notes**: Requires real admission or StorageClass restriction on the fixture — without it the negative can only "not bind" (weak). Distinguish an **admission deny** (policy working) from a PVC that is accepted but never binds due to no provisioner (inconclusive). Bounded wait for the positive `Bound` state; document the timeout.

### CCC.K8S.CN10.AR02 — Verify PV ownership before rebind

- **Requirement**: > When a persistent volume is statically provisioned or rebound, its underlying storage identity and prior ownership MUST be verified before it is mounted by a different workload.
- **Disposition**: `@NotTestable` / Destructive (sanitization proof)
- **Applicability**: tlp-green, tlp-amber, tlp-red
- **Interpretation**: Needs static PV reuse across ownership boundaries with sanitization evidence — unsafe/expensive in shared CI.
- **Approach**: Document preference for dynamic provisioning on good fixture; mark AR `@NotTestable`.

### CCC.K8S.CN11.AR01 — Admission covers every namespace / path

- **Requirement**: > When security admission policies are enabled, every namespace and relevant create or update operation MUST be governed by an explicitly defined policy, including separate policies for system namespaces that require different constraints.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Interpretation**: Admission cannot protect only the normal `Pod create` path. It must prevent equivalent insecure state through a newly created/unlabeled namespace, workload controllers, controller updates, and ephemeral-container updates. System namespaces may have looser rules, but those rules must be explicit rather than an accidental no-policy exemption.
- **Approach**:
  1. **Direct Pod create (`@MAIN`)**: `AttemptAdmitWorkload(cluster, "create", privilegedPod)` in the governed user namespace → `Denied=true`.
  2. **Controller creates (`@MAIN`)**: repeat the same privileged pod template through Deployment, DaemonSet, and Job manifests. The controller object must be denied, or (where policy evaluates generated Pods) no privileged Pod may be created/running; record `DeniedAt=controller|generated-pod`.
  3. **New/unlabeled namespace (`@MAIN`)**: create a disposable namespace without an admission label/binding, then attempt the privileged Pod. Compliance requires either namespace creation to be denied until policy is attached, or the privileged Pod to be denied by a cluster-wide default. A successful privileged Pod is a failure. Delete the namespace in cleanup.
  4. **Update (`@MAIN`)**: create a compliant Deployment, then `AttemptAdmitWorkload(cluster, "update", deploymentWithPrivilegedPodTemplate)` → denied; existing compliant Pods remain unchanged.
  5. **Ephemeral-container update (`@OPT_IN`)**: create a compliant Pod, then call the `ephemeralcontainers` subresource with a privileged debug container → denied. Mark unsupported only where the API/CSP does not expose that subresource.
  6. **Positive control (`@MAIN`)**: a compliant Pod/Deployment in the same user namespace is admitted and reaches running/available state, proving the negative results are policy enforcement rather than a broken scheduler/image.
  7. **System namespace policy inventory (`@MAIN`)**: `GetAdmissionPolicyCoverage` lists every namespace and its effective policy. Assert all configured system namespaces (`kube-system` plus CSP namespaces) have `Explicit=true`, a non-empty `PolicyName`, and documented constraints/exemptions distinct from the user policy. Do not inject a privileged test workload into production system namespaces.
- **Feature sketch**:
  - Scenario A: privileged direct Pod denied.
  - Scenario B: privileged Deployment, DaemonSet, and Job paths cannot produce a running Pod.
  - Scenario C: new unlabeled namespace cannot bypass admission.
  - Scenario D: insecure Deployment update denied.
  - Scenario E (`@OPT_IN`): privileged ephemeral-container update denied.
  - Scenario F: compliant control workload runs.
  - Scenario G: every user/system namespace has an explicit effective admission policy.
- **Config / fixtures**: `test-workload-namespace`; `admission-unlabeled-namespace-prefix`; `system-namespaces` (AWS/Azure/GCP-specific additions allowed); digest-pinned compliant and privileged probe manifests/images; `admission-operation-timeout-ms`.
- **Implementation notes**: Extend `AttemptAdmitWorkload` with `operation=create|update|ephemeral-update`. For controller creates return whether denial occurred at the controller or generated-Pod stage and whether any generated workload ran. `GetAdmissionPolicyCoverage` reads PSS namespace labels plus Kyverno/Gatekeeper/validating-policy bindings and maps each namespace to its effective policy.
- **Gaps / honesty notes**: “Every relevant operation” is open-ended. The test claims only the documented matrix (Pod, Deployment, DaemonSet, Job, Deployment update, optional ephemeral update), not universal coverage of every CRD/controller. System-namespace evidence is inventory-based because an active destructive probe there is unsafe.

### CCC.K8S.CN11.AR02 — Admission config change gated + audited

- **Requirement**: > When admission policy configuration is modified, the change MUST require a dedicated administrative role AND produce an externally retained audit record.
- **Disposition**: Behavioural + Destructive
- **Applicability**: tlp-clear … tlp-red
- **Approach**:
  1. `GetServiceAPIWithIdentity("kubernetes", "test-user-no-access")` + `AttemptModifyAdmissionConfig` → denied.
  2. Admin identity succeeds (`@OPT_IN`) then revert; `logging.QueryLogs(..., "admin", …)` finds the change.
- **Config / fixtures**: Separate policy-admin identity; audit logs exported (CN14 fixture).
- **Gaps / honesty notes**: Prefer mutating a disposable policy object; never leave cluster without admission.

### CCC.K8S.CN11.AR03 — Fail-closed external webhooks

- **Requirement**: > When an external admission component enforces a mandatory control, unavailable or untrusted webhook responses MUST cause the request to be denied.
- **Disposition**: Behavioural (stateful fixture-control test)
- **Applicability**: tlp-green, tlp-amber, tlp-red
- **Interpretation**: The test must leave the webhook registration installed with `failurePolicy=Fail` while making its backend unavailable. Deleting or disabling the `ValidatingWebhookConfiguration` would bypass admission and would **not** prove fail-closed behaviour.
- **Approach**:
  1. Terraform installs the dedicated `admission-webhook-probe` in its own namespace. Its `ValidatingWebhookConfiguration` selects only the disposable webhook-test namespace, so it cannot block unrelated integration workloads.
  2. **Healthy allow path**: `admissionwebhook.SetBackendAvailability(clusterID, enabled=true)` waits for a ready endpoint. `AttemptAdmitWorkload` with a compliant probe manifest → admitted.
  3. **Healthy deny path**: submit a manifest carrying the probe's explicit reject marker → denied with the webhook's rejection reason. This proves the request traversed the intended webhook rather than another admission control.
  4. **Unavailable fail-closed path**: `SetBackendAvailability(..., false)` scales only the probe Deployment to zero and verifies the Service has no ready endpoints; the webhook registration and `failurePolicy=Fail` remain unchanged. Submit the otherwise compliant manifest → denied because the webhook call failed.
  5. **Mandatory recovery check**: in deferred cleanup, re-enable the backend, wait ready, and resubmit the compliant manifest → admitted. Failure to restore the backend fails the test run.
- **Config / fixtures**: `webhook-probe-namespace`, `webhook-probe-test-namespace`, `webhook-probe-deployment`, `webhook-probe-configuration`, `webhook-probe-timeout-ms`; dedicated cloud-api identity may patch `deployments/scale` and read Pods/EndpointSlices only in the probe namespace.
- **Concurrency / safety**: Run this scenario serially under a per-cluster fixture lock. The webhook uses a `namespaceSelector` and object marker scoped to test resources. Do not break Kyverno, Gatekeeper, Azure Policy, or another production admission component.
- **Gaps / honesty notes**: The main scenario proves unavailable-backend fail-closed behaviour. A future optional mode can serve a certificate outside the configured CA to exercise the separate untrusted-TLS branch.

### CCC.K8S.CN12.AR01 — Authenticated kubelet / node admin APIs

- **Requirement**: > When a worker node is active, kubelet and node administrative APIs MUST require authentication and authorization AND anonymous or read-only unauthenticated access MUST be disabled.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Interpretation**: Prove the kubelet actually rejects unauthenticated callers, not just that config claims so. The honest probe originates from **inside** the cluster network (a workload pod), because that is the realistic attacker position for an anonymous kubelet request.
- **Approach**:
  1. **Anonymous probe (`@MAIN`, negative)**: run a short probe Job in `test-workload-namespace` that issues unauthenticated HTTPS requests to the node's kubelet endpoints (`:10250/pods`, `/runningpods`, and read-only `:10255` if present) using the node's in-cluster IP. `ProbeNodeAdminInterfaces` collects the results → `AnonymousKubeletOpen=false` and each endpoint returns `401`/`403` or connection refused.
  2. **Authenticated sanity (`@OPT_IN`)**: the same probe with a valid SA token that lacks `nodes/proxy` RBAC still gets `403` (authz enforced), proving auth is evaluated rather than bypassed. Where the CSP fully hides the kubelet, mark this `—` and rely on step 1 + config.
  3. **Cleanup**: delete the probe Job.
- **Config / fixtures**: `test-workload-namespace`; `kubelet-ports` (default `[10250, 10255]`); digest-pinned probe image; `node-probe-timeout-ms`.
- **Gaps / honesty notes**: Managed node groups often hide the kubelet behind the CSP; when the port is unreachable from the workload network that unreachability **is** acceptable evidence (record `Reachable=false`). Distinguish "refused/unreachable" from "reachable but anonymous-allowed" (the only failing case).

### CCC.K8S.CN12.AR02 — Node SSH/RDP not public

- **Requirement**: > When SSH, RDP, or another node management interface is enabled, it MUST NOT be reachable from the public internet and MUST be restricted to an approved authenticated management path.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Interpretation**: "Not reachable from the public internet" is a claim about an **external** vantage point, so this reuses the shared reachability service rather than a runner-local dial.
- **Approach**:
  1. **Config (`@MAIN`)**: `ProbeNodeAdminInterfaces` → enumerate node external IPs and management ports; assert `PublicIPPresent=false` **or** no SSH/RDP port exposed by SG/NSG/firewall.
  2. **External reachability (`@MAIN`, negative)**: for any node that has a public IP, call `reachability.Prober` (remote FINOS observer, TCP `Protocol`) against `22`/`3389` → `TCPConnected=false`. This is the honest "from the public internet" proof; see the reachability component and cross-service adoption in this document.
  3. Prefer a good fixture with **no** public node IPs (EKS/GKE default) so step 2 is vacuously satisfied and recorded as `PublicIPPresent=false`.
- **Config / fixtures**: `node-mgmt-ports` (default `[22, 3389]`); reachability client vars (`reachability-probe-*`, shared with CN01).
- **Gaps / honesty notes**: If no node has a public IP, the external probe has no target — record config evidence as the pass and skip the dial. Probe-service errors are infrastructure failures, not passes.

### CCC.K8S.CN12.AR03 — Deny metadata access when unneeded

- **Requirement**: > When a workload does not require instance metadata, network access from that workload to the node metadata service MUST be denied.
- **Disposition**: Behavioural
- **Applicability**: tlp-green, tlp-amber, tlp-red
- **Approach**: `AttemptInstanceMetadataAccess` from test pod without metadata entitlement → denied (IMDSv2 hop limit / GKE metadata concealment / NetworkPolicy).
- **Config / fixtures**: Test pod; metadata endpoint address per cloud.
- **Gaps / honesty notes**: Workloads that *do* require metadata are out of scope for the deny path.

### CCC.K8S.CN13.AR01 — CPU/memory requests and limits

- **Requirement**: > When a workload is admitted, every container MUST define approved CPU and memory requests and limits.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Approach** (both directions, `@MAIN`):
  1. **Negative**: `AttemptAdmitWorkload(operation=create)` for a container with **no** `resources.requests`/`limits` → `Denied=true`, `DeniedAt="admission"`. Repeat with requests but **missing limits** (or values outside `approved-resource-profile`) → denied, proving the profile bounds are enforced, not just presence.
  2. **Positive**: submit a workload with approved requests/limits → admitted and `GeneratedWorkloadRunning=true`.
  3. **Runtime readback (`@OPT_IN`)**: read the admitted pod's effective `resources` back from the API and assert they match the approved profile (guards against a mutating webhook silently rewriting them).
- **Config / fixtures**: LimitRange + validating policy; `approved-resource-profile` (min/max cpu+memory); `resource-profile-over-limit` sample for the negative bound.

### CCC.K8S.CN13.AR02 — Namespace ResourceQuota

- **Requirement**: > When a user workload namespace is active, ResourceQuota objects MUST bound its aggregate CPU, memory, storage, workload count, and externally exposed services.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Interpretation**: Presence of a `ResourceQuota` object is necessary but not sufficient — the behavioural proof is that the quota **actually rejects** consumption past its bound.
- **Approach**:
  1. **Presence (`@MAIN`)**: `GetResourceConsumptionBounds` → quotas cover cpu, memory, storage, object counts, and externally exposed services (loadbalancers/nodeports) as applicable to the namespace.
  2. **Enforcement (`@MAIN`, negative)**: `AttemptAdmitWorkload(operation=create)` requesting resources that push aggregate usage **past** an existing quota bound (e.g. a Deployment whose replicas×requests exceed the cpu/memory quota, or an extra LoadBalancer Service beyond the services quota) → `Denied=true` with a quota-exceeded reason.
  3. **Positive control**: a workload within the remaining quota admits successfully.
  4. **Cleanup**: delete created objects so the namespace quota headroom is restored.
- **Config / fixtures**: `quota-exceed-profile` sized relative to the fixture quota; `test-workload-namespace`.

### CCC.K8S.CN13.AR03 — Autoscaler maxima

- **Requirement**: > When workload or node autoscaling is enabled, every autoscaler MUST define an approved maximum replica or capacity boundary.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Approach**:
  1. **Config (`@MAIN`)**: `GetResourceConsumptionBounds` / autoscaler section → HPA `maxReplicas`, cluster-autoscaler / node-pool `maxSize` set and ≤ `approved-autoscaler-max` from config.
  2. **Enforcement (`@OPT_IN`, behavioural)**: drive a workload past its HPA target (or request replicas above `maxReplicas`) and observe that the running replica count **caps at `maxReplicas`** rather than growing unbounded. Gated `@OPT_IN` because it consumes real capacity and takes time to stabilise; node-pool `maxSize` is asserted from config only (scaling nodes in CI is impractical).
- **Config / fixtures**: `approved-autoscaler-max`; `hpa-load-profile` and `hpa-stabilisation-timeout-ms` for the opt-in enforcement path.
- **Gaps / honesty notes**: If autoscaling disabled on fixture, assert `AutoscalingEnabled=false` and skip max checks. The opt-in cap test only exercises workload (HPA) scaling, not node scaling — documented as a known bound.

### CCC.K8S.CN14.AR01 — Export audit and security logs

- **Requirement**: > When a cluster is operational, Kubernetes API audit logs, control-plane logs, and security-relevant node, workload, and network activity records MUST be enabled and exported to an approved external logging destination.
- **Disposition**: Behavioural (**v1 scope-down** — see below)
- **Applicability**: tlp-clear … tlp-red
- **Scope (v1)**: This test asserts **only** the Kubernetes API audit / control-plane logging leg of the AR. Security-relevant **node**, **workload**, and **network** activity export is **explicitly deferred** to a later version — it is not asserted here, and the AR must not be reported as fully covered.
- **Approach**:
  1. Trigger API activity (`UpdateResourcePolicy` or `AttemptAdmitWorkload`).
  2. `logging.QueryLogs(clusterID, "admin", lookback)` returns Succeeded entries for that activity in the configured external sink.
  3. Fixture must enable the CSP control-plane / API-audit logging categories and export them to the configured sink.
- **Config / fixtures**: Logging module outputs; privateer logging vars; no discovery.
- **Gaps / honesty notes**: Deliberate v1 gap vs full AR text: node OS audit, workload runtime, and network-flow (e.g. VPC flow log) export are **not** verified. This is a scope decision, not an oversight — the deferred legs are tracked as follow-up so the AR is not silently over-claimed. A future version can add node/network/workload log-type assertions once those sinks are standardised across AWS/Azure/GCP fixtures.

### CCC.K8S.CN14.AR02 — Separate log access from cluster admins

- **Requirement**: > When Kubernetes audit or monitoring records are retained, write, delete, and configuration access MUST be separated from cluster workload and routine cluster administration identities.
- **Disposition**: `@NotTestable`
- **Applicability**: tlp-clear … tlp-red
- **Interpretation**: Cross-account / separate security boundary IAM — same class as Core CN09.
- **Approach**: Stub; covered conceptually by org logging architecture, not behavioural CI.

### CCC.K8S.CN14.AR03 — Alert on security-sensitive changes

- **Requirement**: > When cluster-admin bindings, admission controls, audit settings, network exposure, or security extensions change, the monitoring system MUST generate an alert for review by an authorized security function.
- **Disposition**: `@NotTestable`
- **Applicability**: tlp-green, tlp-amber, tlp-red
- **Interpretation**: Alert delivery / SOC review cannot be honestly asserted in this harness (mirrors Core CN07).

### CCC.K8S.CN15.AR01 — Required governance metadata present

- **Requirement**: > When a cluster, node pool, namespace, or governed workload is created, all organization-required ownership, environment, data-classification, and policy metadata MUST be present with approved values.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Approach**:
  1. **Presence (`@MAIN`)**: `GetGovernanceMetadata` → required cloud tags + Kubernetes labels from `required-metadata-keys` present with approved values on cluster, node pool, and namespace.
  2. **Enforcement at creation (`@OPT_IN`, negative)**: where the org enforces metadata via admission, `AttemptAdmitWorkload(operation=create)` for a governed workload **missing** a required label (or with a disallowed value) → `Denied=true`. This proves the "MUST be present … when created" gate is actually enforced rather than backfilled. Gated `@OPT_IN` because not every cluster enforces governed-workload labels through admission.
- **Config / fixtures**: Terraform applies required tags/labels on good fixture; `required-metadata-keys`, `approved-metadata-values`, `governed-workload-missing-label-profile`.

### CCC.K8S.CN15.AR02 — Protect policy-significant metadata

- **Requirement**: > When metadata controls authorization, network policy, admission, billing, or data handling, modification of that metadata MUST be restricted to a dedicated role and MUST produce an externally retained audit record.
- **Disposition**: Behavioural + Destructive
- **Applicability**: tlp-clear … tlp-red
- **Approach**: Unauthorized identity `AttemptModifyGovernanceMetadata` → denied; admin succeeds + `logging.QueryLogs` admin event (`@OPT_IN` revert).
- **Gaps / honesty notes**: Protecting labels often needs admission policy — fixture must enforce immutable label keys.

### CCC.K8S.CN16.AR01 — Managed identity provider for humans

- **Requirement**: > When a human accesses the Kubernetes API or cluster resources, authentication MUST use an identity from a centrally managed identity provider or cloud identity service AND that access MUST be revocable independently of the cluster.
- **Disposition**: Behavioural (config assertion)
- **Applicability**: tlp-clear … tlp-red
- **Approach**: `GetClusterAuthConfig` → `ManagedIdP=true` (EKS IAM/OIDC, AKS Entra ID, GKE Google Groups / fleet); local/basic auth disabled.
- **Gaps / honesty notes**: Does not perform live IdP login in CI — asserts cluster auth mode configuration.

### CCC.K8S.CN16.AR02 — No unmanaged human credentials

- **Requirement**: > Unmanaged local accounts, static human credentials, and legacy authentication methods MUST NOT provide human access to the Kubernetes API or cluster resources.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Approach**:
  1. **Config (`@MAIN`)**: `GetClusterAuthConfig` → `LegacyAuthEnabled=false`, `LocalAccountsEnabled=false`, `StaticClientCertsForHumans=false` (as exposed by CSP APIs; e.g. AKS `disableLocalAccounts=true`, GKE basic-auth/client-cert issuance disabled).
  2. **Live rejection (`@OPT_IN`, negative)**: `AttemptClusterAuthWithStaticCredential` builds a client from a legacy/static credential path (basic-auth or a self-issued client cert) and calls a trivial API verb (`SelfSubjectAccessReview` / `GET /version` authenticated) → expect `Authenticated=false` (401). This turns the config assertion into an observed "the static path does not actually work" proof where the CSP still surfaces the endpoint. Gated `@OPT_IN` because some managed control planes remove the legacy handshake entirely (nothing to dial → record config evidence).
- **Config / fixtures**: `legacy-auth-probe-mode` (`basic` \| `client-cert` \| `none`); synthetic non-privileged static credential materialised only for the probe, never a real human credential.
- **Gaps / honesty notes**: Long-lived kubeconfigs issued from IdP sessions are outside CSP API visibility. The live probe can only prove that the *legacy* handshake is rejected, not that no valid IdP-derived kubeconfig was over-shared.

### CCC.K8S.CN17.AR01 — Separate infrastructure identities

- **Requirement**: > Control-plane, worker-node, and supporting components with distinct security responsibilities MUST use independently governed cloud identities.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Interpretation**: Each infrastructure role (control plane, worker nodes, and each supporting add-on such as the CNI, CSI driver, or autoscaler) must run as its **own** cloud identity. The failure this guards against is one shared identity — for example every node pool and add-on reusing a single node IAM role, so a compromise of one component inherits the permissions of all of them.
- **Approach**:
  1. `GetInfrastructureIdentities` returns the cloud principal bound to each role: `control-plane` (where the CSP exposes it), `node` / instance profile per node pool, and one entry per managed add-on.
  2. Assert every `IdentityID` is **distinct** — no principal appears against two different responsibilities (e.g. the CNI add-on identity must differ from the node identity).
  3. Assert each expected role from `required-infra-roles` is present, so a missing (silently shared) identity is a failure rather than a skip.
- **Config / fixtures**: `required-infra-roles` (roles expected on this cloud, e.g. `[node, cni, csi, autoscaler]`); fixture provisions a dedicated identity per add-on rather than reusing the node role.
- **Gaps / honesty notes**: Fully managed control-plane identities are opaque on some clouds (e.g. EKS) — where the control-plane principal is not customer-visible, record it as `unexposed` and assert separation across the identities that **are** visible (node pools + add-ons) instead of failing. This checks that identities are *separate*, not that each is least-privilege (that scoping is CN17.AR02).

### CCC.K8S.CN17.AR02 — Least-privilege infrastructure identities

- **Requirement**: > Each cluster infrastructure identity MUST grant only the cloud actions and resource scope required for its platform responsibility.
- **Disposition**: Policy-deferred / `@NotTestable`
- **Applicability**: tlp-clear … tlp-red
- **Interpretation**: Needs approved permission inventory vs effective IAM — same honesty bar as CN02.AR01.
- **Approach**: Stub; optional future diff against `approved-infra-permissions` artifact.

### CCC.K8S.CN18.AR01 — Supported authenticated node images

- **Requirement**: > Worker nodes MUST use supported images obtained from the service or an authenticated publisher.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear … tlp-red
- **Interpretation**: Two conditions per node's OS image. (1) **Provenance** — the image comes from the CSP's own catalog (EKS-optimized AMI, AKS node image, GKE node image) or from a publisher the org has explicitly approved; not an arbitrary/self-baked image of unknown origin. (2) **Support** — that image is a currently supported/maintained version, not deprecated or past end-of-life. The failure this guards against is nodes booting an untrusted or unpatched OS image.
- **Approach**:
  1. `GetNodeIntegrityStatus` returns, per node pool, the image identifier plus `ImageSource` (`csp` \| `authenticated-publisher` \| `unknown`) and `ImageSupported` (from the CSP's supported-image / deprecation metadata).
  2. Assert `ImageSource` ∈ {`csp`, `authenticated-publisher`} for every node pool. A custom image only counts as `authenticated-publisher` when its publisher/owner matches `approved-image-publishers`; otherwise it resolves to `unknown` and fails.
  3. Assert `ImageSupported=true` for every node pool.
- **Config / fixtures**: `approved-image-publishers` (owner/publisher IDs the org trusts, e.g. the AWS account that owns approved AMIs); fixture node pools use CSP-default images so both checks pass.
- **Gaps / honesty notes**: "Supported" relies on CSP-exposed deprecation/support metadata; where a cloud does not expose it directly, fall back to comparing the image version against a configured `min-supported-node-image` floor and document the substitution. Custom images that are genuinely approved but not resolvable to a publisher via the API must be listed explicitly in config, or they will (correctly) fail as `unknown`.

### CCC.K8S.CN18.AR02 — Boot-integrity verification

- **Requirement**: > Worker nodes MUST use service-supported boot-integrity verification before accepting workloads.
- **Disposition**: Behavioural where CSP supports; else mark unsupported cloud
- **Applicability**: tlp-clear … tlp-red
- **Approach**: `GetNodeIntegrityStatus` → `BootIntegrityEnabled=true` (e.g. GKE confidential / measured boot features, AKS trusted launch, EKS Bottlerocket / NitroTPM where applicable).
- **Gaps / honesty notes**: Feature availability differs sharply by cloud and node OS — fill matrix cells honestly with `—` when unsupported.

---

## Assessment requirements (inherited Core)

### CCC.Core.CN01.* — Encrypt data in transit (API TLS)

- **Disposition**: Behavioural `@PerPort` — **reuse** generic CN01 features; add `@kubernetes`
- **Implementation notes**: `host-name` = private or reachable API FQDN; `port-number` = `443`; runner must include `port/` for service `kubernetes`.

### CCC.Core.CN02.AR01 — Encrypt data for storage

- **Disposition**: Behavioural — **new** `kubernetes/CCC.Core/CCC-Core-CN02-AR01.feature`
- **Approach**: `GetEncryptionAtRestStatus` → secrets/etcd encryption enabled with non-empty KMS key where CSP exposes it.
- **Gaps**: Node OS disks are VM-catalog territory if tested separately; focus on Kubernetes secret store encryption.

### CCC.Core.CN04.* — Log access and changes

- **Disposition**: Behavioural — reuse generic CN04; cluster tag/label flip for admin; kubectl create/get of disposable ConfigMap for data write/read logging where audit policy captures them.
- **Logging**: `logging.QueryLogs` with `admin` / `data-write` / `data-read`; sink from terraform outputs.

### CCC.Core.CN05.* — Prevent untrusted access

- **Disposition**: Destructive + Behavioural — extend generic CN05; unauthorized identity cannot mutate cluster resources.

### CCC.Core.CN06.AR01 — Trust perimeter region

- **Disposition**: Behavioural — reuse `vpc/CCC.Core/CCC-Core-CN06-AR01.feature` with `@kubernetes`; `GetResourceRegion`.

### CCC.Core.CN03.*, CN07.*, CN09.*, CN10.*

- **Disposition**: `@NotTestable` — reuse generic stubs (add `@kubernetes`); CN09 stub may still need creating under generic.

### CCC.Core.CN13.* — Certificate lifetime

- **Disposition**: Behavioural when PerPort cert scenarios exist; else `@NotTestable` until generic/port features land. API server certs are often CSP-rotated — assert validity (AR01) more than rotation cadence (AR02/AR03).

---

## Cloud-api interface (minimal)

### `kubernetes.Service`

Embeds `generic.Service`. Prefer **maps** for inventory/probe results. Every method maps to ≥1 planned scenario.

| Method | Used by AR(s) | Args | Returns (key fields) |
|--------|---------------|------|----------------------|
| `GetAPIEndpointConfig` | K8S.CN01.AR01, AR02 | `clusterID string` | `PublicAccess`, `PrivateAccess`, `AllowedCIDRs`, `EndpointHostname` |
| `AttemptAPIEndpointReachability` | K8S.CN01.AR01, AR02 | `clusterID`, `networkContext string` | `Observer`, `DNSResolved`, `TCPConnected`, `TLSConnected`, `HTTPStatus`, `Failure`, `Duration` |
| `GetRBACPolicyFindings` | K8S.CN02.AR02, CN07.AR02 | `clusterID` | `WildcardRoles[]`, `OverbroadSecretAccess[]` |
| `AttemptSecretAccessAsIdentity` | K8S.CN07.AR01, AR02 | `clusterID`, `namespace`, `secretName`, `serviceAccount`, `verb` (`get`, `list`, `watch`) | `Allowed`, `Denied`, `ValueMatched`, `Reason` |
| `GetWorkloadIdentityStatus` | K8S.CN03.AR01 | `clusterID`, `namespace`, `serviceAccount` | `Federated`, `CloudIdentityID`, `LongLivedKeysPresent` |
| `AttemptCloudAPIAsWorkload` | K8S.CN03.AR01 (negative + optional positive) | `clusterID`, `namespace`, `serviceAccount`, `action` | `Succeeded`, `Denied`, `Error` |
| `FindStaticCloudCredentials` | K8S.CN03.AR02, CN07.AR01 | `clusterID`, `namespace` | `Findings[]` (`Kind`, `Name`, `Reason`) |
| `AttemptAdmitWorkload` | K8S.CN03.AR02, CN04.*, CN05.*, CN11.AR01/AR03, CN13.AR01/AR02, CN15.AR01 | `clusterID`, `operation` (`create`, `update`, `ephemeral-update`), `manifestYAML string` | `Admitted`, `Denied`, `DeniedAt`, `GeneratedWorkloadRunning`, `Reason` |
| `GetAdmissionPolicyCoverage` | K8S.CN11.AR01 | `clusterID` | `Namespaces[]` (`Name`, `System`, `Explicit`, `PolicyName`, `Mode`, `Exemptions`), `Uncovered[]` |
| `GetWorkloadRuntimeSecurity` | K8S.CN05.AR02 | `clusterID`, `podSelector string` | `UID`, `GID`, `AllowPrivilegeEscalation`, `CapabilitiesEmpty`, `SeccompProfile`, `RawEvidence` |
| `GetNamespaceNetworkPolicyStatus` | K8S.CN06.AR01 | `clusterID`, `namespace` | `DefaultDenyIngress`, `DefaultDenyEgress`, `PolicyCapable` |
| `AttemptWorkloadNetworkFlow` | K8S.CN06.AR01, AR02 | `clusterID`, `fromSelector`, `toHost`, `port`, `protocol` | `Allowed`, `Connected`, `Error` |
| `GetClusterComponentInventory` | CN09.AR01, CN09.AR03 (CN08.AR01 `@OPT_IN` corroboration only) | `clusterID` | `ControlPlaneVersion`, `Workers[]`, `Addons[]` (`Name`,`Version`,`InAllowlist`,`Compatible`,`InSupport`) |
| `AttemptCreatePVC` | K8S.CN10.AR01 | `clusterID`, `claimYAML` | `Created`, `Denied`, `Bound`, `Reason` |
| `AttemptModifyAdmissionConfig` | K8S.CN11.AR02 | `clusterID`, `change map` | `Applied`, `Denied`, `Reason` |
| `ProbeNodeAdminInterfaces` | K8S.CN12.AR01, AR02 | `clusterID`, `nodeID` (optional), `kubeletPorts[]`, `mgmtPorts[]` | `AnonymousKubeletOpen`, `KubeletReachable`, `PublicSSHOpen`, `PublicRDPOpen`, `PublicIPPresent`, `Nodes[]{ExternalIP, OpenMgmtPorts[]}` (CN12.AR02 external proof delegates to `reachability.Prober`) |
| `AttemptInstanceMetadataAccess` | K8S.CN12.AR03 | `clusterID`, `podSelector` | `Reachable`, `Denied`, `Error` |
| `GetResourceConsumptionBounds` | K8S.CN13.AR02, AR03 | `clusterID`, `namespace` | `Quotas{}`, `AutoscalerMax{}`, `AutoscalingEnabled` |
| `GetGovernanceMetadata` | K8S.CN15.AR01 | `clusterID` | `Tags{}`, `Labels{}`, `MissingRequired[]` |
| `AttemptModifyGovernanceMetadata` | K8S.CN15.AR02 | `clusterID`, `target`, `patch` | `Applied`, `Denied`, `Reason` |
| `GetClusterAuthConfig` | K8S.CN16.AR01, AR02 | `clusterID` | `ManagedIdP`, `LegacyAuthEnabled`, `LocalAccountsEnabled`, `StaticClientCertsForHumans` |
| `AttemptClusterAuthWithStaticCredential` | K8S.CN16.AR02 (`@OPT_IN`, negative) | `clusterID`, `mode` (`basic`, `client-cert`) | `Authenticated`, `Denied`, `StatusCode`, `Error` |
| `GetInfrastructureIdentities` | K8S.CN17.AR01 | `clusterID` | `Principals[]` (`Role`, `IdentityID`, `Exposed`) |
| `GetNodeIntegrityStatus` | K8S.CN18.AR01, AR02 | `clusterID` | `Nodes[]` (`ImageID`, `ImageSource` (`csp`\|`authenticated-publisher`\|`unknown`), `ImageSupported`, `BootIntegrityEnabled`) |
| `GetEncryptionAtRestStatus` | Core.CN02, K8S.CN07.AR01 | `clusterID` | `SecretsEncrypted`, `KMSKeyID`, `Provider` |

**Method count: 25** Kubernetes-specific methods (admission + inventory heavy service) + generic/logging embed + shared `reachability.Prober` client + the separate one-method `admissionwebhook.Service` fixture controller. Do **not** add `QueryLogs` on this interface.

**Collapse notes**: `AttemptAdmitWorkload` is the shared trigger for static-credential, image, PSS, resource, quota, and governance-metadata ARs — pass different manifests rather than adding per-AR methods. CN12.AR02's "public internet" leg reuses the shared `reachability.Prober` rather than a new method.

### `reachability.Prober` (shared cloud-api client)

Planned package: `modules/cloud-api/reachability/`. This is not a `generic.Service` factory service; Kubernetes and VM implementations receive it as a dependency.

| Method | Used by AR(s) | Args | Returns |
|--------|---------------|------|---------|
| `Probe` | K8S.CN01.AR01, AR02; reusable by VM Core.CN12 | `context.Context`, `Request{Host, Port, Protocol, ServerName, Timeout, NetworkContext}` | `Result{Observer, DNSResolved, TCPConnected, TLSConnected, HTTPStatus, RemoteAddr, Failure, Duration}` |

Implementations:

- `LocalProber`: `net.Dialer` / TLS handshake from the current process; preserves the existing VM behaviour.
- `RemoteProber`: authenticated HTTPS request to the FINOS reachability service. It signs timestamp + nonce + body using HMAC-SHA256 and the configured shared secret.
- Do not expose a synthetic `Denied` boolean. DNS failure, timeout, refusal, TLS failure, and HTTP authentication response carry different evidentiary meaning.

### `modules/probes/reachability` (separate deployable Go module)

Planned module: `modules/probes/reachability/`, with its own `go.mod`, server command/container artifact, health endpoint, unit tests, and deployment documentation. It imports the shared wire contract from `github.com/finos/common-cloud-controls/cloud-api/reachability`. Its Go code is released independently; its AWS deployment is provisioned from the standalone `modules/cloud-api-test/terraform/aws-test-infra/` root (separate from the main `terraform/aws/` root), not baked into any per-service fixture.

The FINOS estate supplies:

- a stable public HTTPS URL and known observer/egress identity;
- `REACHABILITY_PROBE_SHARED_SECRET` from its secret manager;
- an explicit hostname/CIDR and port policy;
- request audit logs, rate limits, and replay protection.

The integration runner receives the same secret through CI secret expansion. Neither side logs the secret or includes it in test attachments. Initial endpoint: `POST /v1/probes`; body is the shared `reachability.Request`, response is `reachability.Result`.

#### Cross-service adoption (implementation plan)

The `reachability` client and FINOS `reachability-probe` are shared infrastructure. Once the package exists, retrofit the existing network-deny tests to consume it rather than dialing from the runner. Sequence the work so the abstraction is proven on the simplest consumer first:

1. **virtual-machines — `CCC.Core.CN12.AR01`** (first adopter). Replace the direct `net.DialTimeout` in `virtualmachines.AttemptInboundConnection` (see `modules/cloud-api/virtual-machines/aws-virtual-machines.go`) with an injected `reachability.Prober`. `LocalProber` preserves today's behaviour; `RemoteProber` gives an honest untrusted vantage. Update `modules/features/virtual-machines/analysis.md` and the CN12 feature to interpret the richer `Result` (`TCPConnected` instead of `Connected`). Track in that analysis, not here.
2. **serverless-computing — `CCC.SvlsComp.CN01.AR01`**. Back `AttemptPublicInternetInvoke` with the remote prober (HTTPS `Protocol`) so "public internet invoke denied" is observed from outside the estate instead of the runner. Keep `GetInvokeEndpointExposure` as the config-evidence half. Track in `modules/features/serverless-computing/analysis.md`.
3. **kubernetes — `CCC.K8S.CN01.AR01/AR02`** (this document) and **`CCC.K8S.CN12.AR02`** node SSH/RDP exposure.

Each consumer keeps a config-only / `LocalProber` fallback (`@SANITY`) for when the FINOS service is unavailable, and treats probe-service errors as infrastructure failures, never compliance passes.

### `admissionwebhook.Service` (fixture controller)

Planned package: `modules/cloud-api/admission-webhook/`, factory service id `admission-webhook`. This is deliberately separate from `kubernetes.Service`: it controls the lifecycle of the test component and is not evidence about an arbitrary production webhook.

| Method | Used by AR(s) | Args | Returns |
|--------|---------------|------|---------|
| `SetBackendAvailability` | K8S.CN11.AR03 | `clusterID string`, `enabled bool` | `Status{Enabled, DesiredReplicas, ReadyReplicas, ReadyEndpoints, RegistrationPresent, FailurePolicy}` |

The method is intentionally narrow:

- `enabled=false` scales the configured probe Deployment to zero and waits until the Service has no ready endpoints.
- `enabled=true` restores the configured replica count and waits for both Deployment readiness and a ready Service endpoint.
- It must verify that the `ValidatingWebhookConfiguration` remains present with `failurePolicy=Fail` in both states.
- It must not create/delete webhook configurations, modify selectors, or control arbitrary Deployments.
- The implementation records the original replica count, restores `webhook-probe-enabled-replicas` in deferred cleanup, and starts every scenario by enabling the backend so a previously interrupted run self-heals.

### `modules/probes/admission-webhook` (separate deployable Go module)

Planned module: `modules/probes/admission-webhook/`, with its own `go.mod`, server command/container artifact, unit tests, Kubernetes manifests (or Helm chart), and deployment documentation. Add it to `modules/go.work` during implementation.

The server exposes `/validate`, `/healthz`, and `/readyz`. `/validate` accepts Kubernetes `AdmissionReview` requests and has deterministic behaviour:

- allow a compliant marked probe object;
- deny an object carrying the explicit reject marker, returning a stable reason used by the feature assertion;
- ignore all resources outside the configured namespace/object selectors.

The fixture supplies a private Service, Deployment, ServiceAccount, TLS Secret, and `ValidatingWebhookConfiguration` with `failurePolicy=Fail`, `sideEffects=None`, explicit `admissionReviewVersions`, timeout, CA bundle, and narrow namespace/object selectors. These objects are applied **into** the integration cluster from the standalone `modules/cloud-api-test/terraform/aws-test-infra/` root (via the Kubernetes/Helm providers against the main root's cluster outputs), not from the kubernetes service submodule — see the Terraform fixtures section.

### `logging.Service`

| logType | AR(s) | resourceID meaning |
|---------|-------|-------------------|
| `admin` | Core.CN04.AR01, K8S.CN11.AR02, K8S.CN14.AR01, K8S.CN15.AR02 | Cluster name / ARN / resource id |
| `data-write` | Core.CN04.AR02 | Cluster / namespace resource id |
| `data-read` | Core.CN04.AR03 | Cluster / namespace resource id |

### `generic.Service` methods used

| Method | AR(s) |
|--------|-------|
| `GetOrProvisionTestableResources` | all |
| `GetResourceRegion` | Core.CN06.AR01 |
| `UpdateResourcePolicy` | Core.CN04.AR01, Core.CN05.AR02, K8S.CN14.AR01 trigger |
| `TriggerDataWrite` | Core.CN04.AR02, Core.CN05.AR01 |
| `TriggerDataRead` | Core.CN04.AR03, Core.CN05.AR06 |
| `CheckUserProvisioned` | identity scenarios |
| `TearDown` | disposable manifests created during probes |

---

## Cross-cloud implementation

### `GetAPIEndpointConfig` / `AttemptAPIEndpointReachability`

`GetAPIEndpointConfig` remains provider-specific. Reachability is provider-neutral: all three implementations pass the resolved API hostname to `reachability.RemoteProber`, which calls the FINOS-owned service outside the integration estates. A successful TCP/TLS handshake (including HTTP 401/403) demonstrates public network reachability. A failed probe is only treated as supporting evidence when endpoint configuration independently shows the intended restriction.

#### AWS

- **API**: `eks:DescribeCluster` — `resourcesVpcConfig.endpointPublicAccess`, `endpointPrivateAccess`, `publicAccessCidrs`.
- **Reachability**: FINOS remote observer performs TLS dial to the EKS endpoint; SG/NACL may also apply.
- **Config**: `region`, cluster name, `approved-api-cidrs`, reachability client settings.

#### Azure

- **API**: AKS `ManagedClusters.Get` — `apiServerAccessProfile.enablePrivateCluster`, `authorizedIpRanges`.
- **Notes**: Public FQDN with IP allowlist satisfies CN01.AR01 but **fails** CN01.AR02.
- **Config**: `azure-resource-group`, cluster name.

#### GCP

- **API**: `container.Projects.Locations.Clusters.Get` — `privateClusterConfig`, `masterAuthorizedNetworksConfig`.
- **Config**: `gcp-project-id`, `gcp-location`, cluster name.

### `GetRBACPolicyFindings` / `AttemptAdmitWorkload` / `GetAdmissionPolicyCoverage` / PVC / network / metadata probes

#### AWS / Azure / GCP

- **API**: Kubernetes API via cloud-authenticated kubeconfig (EKS token, AKS AAD/kubelogin, GKE google auth). Prefer client-go.
- **Admission**: Manifest create/update via client-go; use dry-run where it exercises the same admission chain, otherwise create+delete disposable resources. Exercise direct Pod, Deployment, DaemonSet, Job, Deployment update, and (where supported) `ephemeralcontainers` subresource; expect `Forbidden` / admission webhook denial or verify no generated Pod runs.
- **Coverage inventory**: Read namespace PSS labels plus installed ValidatingAdmissionPolicy bindings and Kyverno/Gatekeeper policy bindings. Provider-native policy integrations may surface as webhooks; map each namespace to its effective policy and explicit exemptions.
- **Config**: Cluster credentials from terraform outputs / OIDC; never embed long-lived kubeconfig secrets in repo.

### `admissionwebhook.SetBackendAvailability`

#### AWS / Azure / GCP

- **API**: provider-authenticated Kubernetes API via client-go; no provider-specific admission API is required after cluster authentication.
- **Disable**: patch only the configured probe Deployment's `scale` subresource to zero, then watch the Deployment and EndpointSlice until no ready endpoint remains.
- **Enable**: restore the fixture's configured replica count, then watch Deployment availability and EndpointSlice readiness.
- **Guardrails**: verify the target namespace, Deployment UID/labels, Service, and webhook configuration names match privateer configuration before mutation. Refuse arbitrary resource names or a webhook selector that covers namespaces outside the disposable test namespace.
- **RBAC**: the fixture-control identity receives `get/watch` on the named Deployment, Pods, Service, EndpointSlices, and webhook configuration, plus `patch` on only the probe Deployment's scale subresource where Kubernetes RBAC permits resource-name scoping.
- **Config**: cloud-authenticated kubeconfig plus the `webhook-probe-*` variables; behavior is cloud-neutral.

### `GetWorkloadIdentityStatus` / `FindStaticCloudCredentials`

#### AWS

- IRSA: SA annotation `eks.amazonaws.com/role-arn`; scan Secrets/Env for `AKIA…`.
- Negative: unbound SA has no role-arn; `AttemptCloudAPIAsWorkload` runs a short Job that calls STS/`GetCallerIdentity` or reads a probe S3 object — expect failure without IRSA token.
#### Azure
- Workload Identity: SA labels/annotations `azure.workload.identity/*`; federated credential on UAMI.
- Negative: unbound SA lacks WI labels; cloud call via DefaultAzureCredential from that SA fails.
#### GCP
- GKE WI: SA annotation `iam.gke.io/gcp-service-account`; scan for SA JSON.
- Negative: unbound SA has no GSA binding; cloud call fails.

### `GetClusterComponentInventory`

#### AWS
- `eks:DescribeCluster`, `ListAddons`, `DescribeAddon` / `DescribeAddonVersions` (filter by cluster Kubernetes version), `DescribeNodegroup` (+ AMI / platform version for AR01).
- **CN09.AR03**: for each installed addon, assert `addonVersion` is in the CSP-returned compatible set for this control-plane version and addon health is not version-mismatch degraded.
#### Azure
- AKS agent pool orchestrator version; `ManagedCluster.AddonProfiles` / extensions APIs + AKS Kubernetes version support matrix.
- **CN09.AR03**: each enabled addon/extension version marked compatible with the cluster's Kubernetes version.
#### GCP
- GKE `currentMasterVersion`, node pool versions, `addonsConfig`; release channels for support.
- **CN09.AR03**: managed addon config versions track a channel/version CSP documents as compatible with the master version.
### `ProbeNodeAdminInterfaces` / `AttemptInstanceMetadataAccess`

#### AWS
- EC2 instance public IP / SG for SSH; IMDS `169.254.169.254` from pod (hop limit 1 / NetworkPolicy).
#### Azure
- Node NIC public IP; IMDS `169.254.169.254` with AKS hostNetwork restrictions.
#### GCP
- GCE metadata concealment / Workload Identity; firewall for SSH.

### `GetEncryptionAtRestStatus`

#### AWS
- EKS secrets encryption config (`encryptionConfig` KMS key ARN).
#### Azure
- AKS host-based encryption / KMS etcd encryption features as exposed on managed cluster.
#### GCP
- GKE database encryption (`databaseEncryption.state` / KMS key).

### `GetNodeIntegrityStatus`

#### AWS
- Bottlerocket / AL2023 EKS-optimized AMI identity; NitroTPM/Measured Boot where available — mark `—` if not exposed.
#### Azure
- Trusted launch / Secure Boot / vTPM on agent pools.
#### GCP
- Shielded nodes / secure boot / integrity monitoring — primary cloud where AR02 is straightforward.

### `UpdateResourcePolicy` / `TriggerDataWrite` / `TriggerDataRead` (generic embed)

#### AWS
- Tag update on EKS cluster; Kubernetes ConfigMap mutate/get for data plane audit events when control-plane logging enabled.
#### Azure
- Cluster tags via ARM; Activity Log + diagnostic settings for kube-audit.
#### GCP
- Cluster labels; Cloud Audit Logs + GKE audit logs to configured sink.

### `logging.QueryLogs`

Reuse existing `logging.Service`. **Prerequisites**: EKS control plane logging to CloudWatch; AKS diagnostic settings to Log Analytics; GKE logging to Cloud Logging — all sink IDs in privateer vars (no discovery).

---

## Terraform fixtures (planned)

| Fixture name | Role | AR(s) | Cloud(s) |
|--------------|------|-------|----------|
| `finos-ccc-integration-k8s-main` | Compliant private cluster: restricted API, PSS Restricted, default-deny NP, WI (**bound + unbound** test SAs), encryption, logging export, quotas, managed auth, allowlisted addons, and namespace-scoped admission webhook probe | Most behavioural | aws, azure, gcp |
| `finos-ccc-integration-k8s-bad` | Non-compliant cluster: public API / missing NetworkPolicy / unsigned image path for negative jobs | CN01, CN04, CN06 negatives | aws, azure, gcp |

Submodule path: `modules/cloud-api-test/terraform/<cloud>/modules/kubernetes/`.

**Separate test-infra Terraform root.** Both deployable test-support probes — the `reachability-probe` service and the `admission-webhook-probe` — are provisioned from a **new, standalone Terraform root** `modules/cloud-api-test/terraform/aws-test-infra/`, applied **separately** (its own state / apply cycle) from the main `modules/cloud-api-test/terraform/aws/` root. This keeps the probes on an independent lifecycle from the per-service fixtures, so they can be deployed once and reused across test runs rather than being torn down with the service fixtures. Azure/GCP equivalents (`azure-test-infra/`, `gcp-test-infra/`) follow the same pattern when those clouds are onboarded.

- **`reachability-probe`** (public untrusted vantage): `aws-test-infra` deploys the FINOS-owned probe service (see the `modules/probes/reachability/` Go module) with its own public egress identity, DNS, and shared-secret wiring. It sits outside every service fixture's trust perimeter and hands its URL + shared secret to CI through protected environment secrets — never a main-root terraform output.
- **`admission-webhook-probe`** (in-cluster component): although it must ultimately run **inside** `finos-ccc-integration-k8s-main` (Kubernetes admission webhooks are called by the cluster API server), it is applied from `aws-test-infra` rather than the kubernetes service submodule. That root consumes the main root's cluster endpoint/auth outputs via a remote state data source and uses the Kubernetes/Helm providers to create the probe namespace, test namespace and labels, Deployment, Service, TLS trust material, narrowly scoped `ValidatingWebhookConfiguration`, and fixture-controller RBAC. Applying `aws-test-infra` therefore depends on the main root having already created the cluster.

**Fixture expectations (main):**

- Private or CIDR-locked API endpoint
- Workload Identity enabled + sample **bound** SA and companion **unbound** SA (CN03 negative)
- Admission policy (PSS Restricted and/or Kyverno/Gatekeeper) for image/PSS/resources **and** static cloud-credential rejection (CN03.AR02)
- Dedicated `admission-webhook-probe`, healthy by default, with `failurePolicy=Fail` and selectors limited to its disposable test namespace (CN11.AR03)
- Default-deny NetworkPolicy in test namespace + one allow flow
- Control-plane audit logs → external sink
- Secrets encryption with CMK where supported
- ResourceQuota + LimitRange; autoscaler max if enabled
- Required tags/labels
- Node pools on supported CSP images; boot integrity where cloud supports

---

## Integration test coverage (planned)

| api | method | cloud | expect_error | arg1 | Notes |
|-----|--------|-------|--------------|------|-------|
| `kubernetes` | `GetAPIEndpointConfig` | all | | `finos-ccc-integration-k8s-main` | Assert private/CIDR |
| `kubernetes` | `AttemptAPIEndpointReachability` | all | | cluster, `untrusted` | Remote observer returns `TCPConnected=false`; probe/API errors fail as infrastructure errors |
| `kubernetes` | `GetRBACPolicyFindings` | all | | cluster | No wildcards |
| `kubernetes` | `AttemptSecretAccessAsIdentity` | all | | secret + intended SA | CN07.AR01 authorized read |
| `kubernetes` | `AttemptSecretAccessAsIdentity` | all | true | secret + unauthorized SA | CN07.AR01 denied |
| `kubernetes` | `AttemptSecretAccessAsIdentity` | all | true | unrelated secret + intended SA + `get` | CN07.AR02 named-secret boundary |
| `kubernetes` | `AttemptSecretAccessAsIdentity` | all | true | intended SA + `list` | CN07.AR02 no enumeration |
| `kubernetes` | `AttemptSecretAccessAsIdentity` | all | true | intended SA + `watch` | CN07.AR02 no watch |
| `kubernetes` | `GetWorkloadIdentityStatus` | all | | cluster + bound SA | `Federated=true` |
| `kubernetes` | `GetWorkloadIdentityStatus` | all | | cluster + unbound SA | `Federated=false` (negative) |
| `kubernetes` | `AttemptCloudAPIAsWorkload` | all | true | unbound SA + probe action | Live negative: cloud call denied |
| `kubernetes` | `FindStaticCloudCredentials` | all | | cluster + ns | Empty findings |
| `kubernetes` | `AttemptAdmitWorkload` | all | true | static-credential manifest | CN03.AR02 deny |
| `kubernetes` | `AttemptAdmitWorkload` | all | true | privileged manifest | CN05.AR01 |
| `kubernetes` | `AttemptAdmitWorkload` | all | true | insecure Linux securityContext | CN05.AR02 deny |
| `kubernetes` | `GetWorkloadRuntimeSecurity` | all | | security-probe pod | CN05.AR02: UID>0, caps dropped, RuntimeDefault |
| `kubernetes` | `AttemptAdmitWorkload` | all | true | tag-only image | CN04.AR01 |
| `kubernetes` | `GetNamespaceNetworkPolicyStatus` | all | | cluster + ns | Default deny |
| `kubernetes` | `AttemptWorkloadNetworkFlow` | all | true | isolated pod → control listener | CN06.AR01 egress deny |
| `kubernetes` | `AttemptWorkloadNetworkFlow` | all | true | control pod → isolated listener | CN06.AR01 ingress deny |
| `kubernetes` | `AttemptWorkloadNetworkFlow` | all | | control pod → allowed listener | CN06.AR01 positive control |
| `kubernetes` | `AttemptWorkloadNetworkFlow` | all | | probe → allowlist URL | CN06.AR02 allow |
| `kubernetes` | `AttemptWorkloadNetworkFlow` | all | true | probe → denylist URL | CN06.AR02 deny |
| `kubernetes` | `GetClusterComponentInventory` | all | | cluster | CN09.AR01 support + CN09.AR03 addon version compatibility |
| `kubernetes` | `AttemptCreatePVC` | all | true | disallowed StorageClass | CN10.AR01 deny |
| `kubernetes` | `AttemptCreatePVC` | all | true | disallowed accessMode | CN10.AR01 deny |
| `kubernetes` | `AttemptCreatePVC` | all | | compliant claim | CN10.AR01 created + Bound |
| `kubernetes` | `AttemptAdmitWorkload` | all | true | create privileged Pod | CN11.AR01 direct create denied |
| `kubernetes` | `AttemptAdmitWorkload` | all | true | create privileged Deployment/DaemonSet/Job | CN11.AR01 controller paths denied / no Pod runs |
| `kubernetes` | `AttemptAdmitWorkload` | all | true | create namespace + privileged Pod bundle | CN11.AR01 unlabeled namespace cannot bypass |
| `kubernetes` | `AttemptAdmitWorkload` | all | true | update Deployment to privileged template | CN11.AR01 update denied |
| `kubernetes` | `AttemptAdmitWorkload` | all | true | ephemeral-update privileged debug container | CN11.AR01 `@OPT_IN` |
| `kubernetes` | `AttemptAdmitWorkload` | all | | create compliant Deployment | CN11.AR01 positive control runs |
| `kubernetes` | `GetAdmissionPolicyCoverage` | all | | cluster | CN11.AR01 no uncovered user/system namespaces |
| `admission-webhook` | `SetBackendAvailability` | all | | cluster + `true` | CN11.AR03 healthy backend ready; registration remains fail-closed |
| `kubernetes` | `AttemptAdmitWorkload` | all | | webhook compliant marker | CN11.AR03 healthy allow path |
| `kubernetes` | `AttemptAdmitWorkload` | all | true | webhook explicit-reject marker | CN11.AR03 healthy deny proves webhook traversal |
| `admission-webhook` | `SetBackendAvailability` | all | | cluster + `false` | CN11.AR03 backend unavailable; registration remains installed |
| `kubernetes` | `AttemptAdmitWorkload` | all | true | webhook compliant marker while unavailable | CN11.AR03 fail-closed denial |
| `admission-webhook` | `SetBackendAvailability` | all | | cluster + `true` | CN11.AR03 mandatory recovery and readiness check |
| `kubernetes` | `ProbeNodeAdminInterfaces` | all | | cluster | CN12.AR01 anon kubelet closed / CN12.AR02 no public mgmt port |
| `kubernetes` | `reachability.Prober` | all | true | node public IP:22/3389 | CN12.AR02 external observer TCP not connected |
| `kubernetes` | `AttemptInstanceMetadataAccess` | all | true | pod selector | CN12.AR03 |
| `kubernetes` | `AttemptAdmitWorkload` | all | true | container missing/over-limit resources | CN13.AR01 deny |
| `kubernetes` | `AttemptAdmitWorkload` | all | | compliant resources | CN13.AR01 admit + optional readback |
| `kubernetes` | `GetResourceConsumptionBounds` | all | | cluster + ns | CN13.AR02/AR03 quotas + autoscaler max present |
| `kubernetes` | `AttemptAdmitWorkload` | all | true | workload past quota bound | CN13.AR02 quota-exceeded deny |
| `kubernetes` | `GetGovernanceMetadata` | all | | cluster | CN15.AR01 required keys present |
| `kubernetes` | `AttemptAdmitWorkload` | all | true | governed workload missing required label | CN15.AR01 `@OPT_IN` deny |
| `kubernetes` | `AttemptModifyGovernanceMetadata` | all | true | no-access identity | CN15.AR02 |
| `kubernetes` | `GetClusterAuthConfig` | all | | cluster | Managed IdP |
| `kubernetes` | `AttemptClusterAuthWithStaticCredential` | all | true | static/basic credential | CN16.AR02 `@OPT_IN` auth rejected |
| `kubernetes` | `GetInfrastructureIdentities` | all | | cluster | Distinct principals |
| `kubernetes` | `GetNodeIntegrityStatus` | all | | cluster | Image + boot where supported |
| `kubernetes` | `GetEncryptionAtRestStatus` | all | | cluster | Core CN02 |
| `kubernetes` | `UpdateResourcePolicy` | all | | | Core CN04 |
| `kubernetes` | `TriggerDataWrite` | all | | resource | Core CN04/CN05 |
| `kubernetes` | `TriggerDataRead` | all | | resource | Core CN04/CN05 |
| `kubernetes` | `GetResourceRegion` | all | | resource | Core CN06 |
| `logging` | `QueryLogs` | all | | cluster, `admin`, `60` | CN04 / CN14 |

Vars for `modules/cloud-api-test/privateer-config/*.yml`: cluster resource name, logging sink IDs, kube auth settings from terraform outputs.

---

## Privateer config (planned vars)

### Behavioural (`cfi-testing/privateer-config/finos-integration/kubernetes/`)

| Var | Purpose | Example |
|-----|---------|---------|
| `service` / `service-type` | factory id | `kubernetes` |
| `tags` | scenario filter | `@Behavioural @kubernetes` |
| `resource` | cluster Name / id filter | `finos-ccc-integration-k8s-main` |
| `host-name` / `port-number` | Core CN01 PerPort | API FQDN, `443` |
| `permitted-regions` | Core CN06 | `[us-east-1]` |
| `approved-api-cidrs` | CN01 | `[10.0.0.0/8]` |
| `reachability-probe-mode` | CN01 untrusted vantage | `remote` |
| `reachability-probe-url` | FINOS-owned probe API | `${REACHABILITY_PROBE_URL}` |
| `reachability-probe-shared-secret` | HMAC request authentication | `${REACHABILITY_PROBE_SHARED_SECRET}` (secret-expanded; never committed) |
| `reachability-probe-observer` | Verify expected remote vantage | `finos-public-probe` |
| `reachability-probe-timeout-ms` | Bound remote and target calls | `5000` |
| `approved-registries` | CN04 | `[123456789012.dkr.ecr.us-east-1.amazonaws.com]` |
| `addon-allowlist` | CN08 `@OPT_IN` corroboration only (not behavioural) | `[vpc-cni, coredns, kube-proxy]` |
| `required-metadata-keys` | CN15 | `[Owner, Environment, DataClassification]` |
| `approved-storage-classes` / `disallowed-storage-class` | CN10.AR01 | `[ccc-approved-sc]` / `ccc-blocked-sc` |
| `approved-access-mode` / `disallowed-access-mode` | CN10.AR01 | `ReadWriteOnce` / `ReadWriteMany` |
| `pvc-bind-timeout-ms` | CN10.AR01 positive Bound wait | `60000` |
| `test-workload-namespace` | CN03/CN06/CN07 | `ccc-test` |
| `test-workload-service-account` | CN03.AR01 positive | `ccc-wi-sa` |
| `test-workload-service-account-unbound` | CN03.AR01 negative / CN07.AR01 unauthorized | `ccc-wi-sa-unbound` |
| `protected-secret-name` | CN07.AR01 identity-scoped access | `ccc-protected-secret` |
| `unrelated-secret-name` | CN07.AR02 named-secret negative | `ccc-unrelated-secret` |
| `secret-watch-timeout-ms` | Bound CN07.AR02 watch probe | `3000` |
| `wi-probe-resource` | CN03.AR01 live call target | tagged bucket/resource readable only by bound identity |
| `network-control-namespace` | CN06 positive/control source | `ccc-network-control` |
| `network-probe-image` | CN06 short-lived client/listener | approved digest-pinned image |
| `network-probe-port` / `network-probe-protocol` | CN06 flow target | `8080`, `tcp` |
| `network-allowlist-urls` | CN06.AR02 permitted destinations | `[http://ccc-allowed.ccc-network-control.svc:8080/health]` |
| `network-denylist-urls` | CN06.AR02 blocked destinations | `[http://ccc-denied.ccc-network-control.svc:8080/health]` |
| `admission-unlabeled-namespace-prefix` | CN11.AR01 disposable namespace | `ccc-admission-unlabeled-` |
| `system-namespaces` | CN11.AR01 explicit policy coverage | `[kube-system, kube-public, kube-node-lease]` plus CSP namespaces |
| `admission-operation-timeout-ms` | CN11.AR01 controller/update waits | `30000` |
| `webhook-probe-namespace` | CN11.AR03 component namespace | `ccc-admission-webhook-probe` |
| `webhook-probe-test-namespace` | CN11.AR03 narrowly selected workload namespace | `ccc-admission-webhook-test` |
| `webhook-probe-deployment` | CN11.AR03 fixture controller target | `ccc-admission-webhook-probe` |
| `webhook-probe-configuration` | CN11.AR03 immutable registration check | `ccc-admission-webhook-probe` |
| `webhook-probe-enabled-replicas` | CN11.AR03 known recovery state | `1` |
| `webhook-probe-timeout-ms` | CN11.AR03 disable/enable readiness bound | `30000` |
| `kubelet-ports` | CN12.AR01 anonymous kubelet probe targets | `[10250, 10255]` |
| `node-probe-timeout-ms` | CN12.AR01 in-cluster probe bound | `5000` |
| `node-mgmt-ports` | CN12.AR02 SSH/RDP external probe targets | `[22, 3389]` |
| `approved-resource-profile` / `resource-profile-over-limit` | CN13.AR01 admit / deny bounds | requests+limits within / above LimitRange |
| `quota-exceed-profile` | CN13.AR02 quota enforcement negative | replicas×requests above namespace quota |
| `approved-autoscaler-max` | CN13.AR03 max boundary | `10` |
| `hpa-load-profile` / `hpa-stabilisation-timeout-ms` | CN13.AR03 `@OPT_IN` cap enforcement | load spec / `180000` |
| `approved-metadata-values` | CN15.AR01 approved value set per key | `{Environment: [prod, nonprod]}` |
| `governed-workload-missing-label-profile` | CN15.AR01 `@OPT_IN` admission negative | manifest missing a required label |
| `legacy-auth-probe-mode` | CN16.AR02 `@OPT_IN` static-auth rejection probe | `basic` \| `client-cert` \| `none` |
| `system-role-prefixes` | CN02 | `[system:, kube-]` |
| `required-infra-roles` | CN17.AR01 distinct-identity coverage | `[node, cni, csi, autoscaler]` |
| `approved-image-publishers` | CN18.AR01 trusted image owners/publishers | `[amazon, <approved-ami-owner-id>]` |
| `min-supported-node-image` | CN18.AR01 support floor when CSP omits deprecation metadata | per-cloud image/version floor |
| `test-identities` | CN05 / CN11 / CN15 | same shape as object-storage |
| Logging sink vars | CN04 / CN14 | cloud-specific from terraform |

### Integration (`modules/cloud-api-test/privateer-config/<cloud>.yml`)

| Var | Purpose | Example |
|-----|---------|---------|
| `resource` | CSV / GetOrProvision filter | `finos-ccc-integration-k8s-main` |
| `aws-flow-log-group-name` / Azure LAW / GCP log name | logging | terraform output |
| Cluster kube endpoint / auth outputs | client-go | terraform output |
| Webhook probe namespace / Deployment / Service / configuration | CN11.AR03 fixture controller | terraform outputs |

---

## CI actions-config (planned)

| File | `privateer-service` | `test-configuration` |
|------|---------------------|----------------------|
| `cfi-testing/actions-config/aws-kubernetes-finos.yaml` | `awsKubernetes` | `../privateer-config/finos-integration/kubernetes/aws-….yml` |
| `cfi-testing/actions-config/azure-kubernetes-finos.yaml` | `azureKubernetes` | `../privateer-config/finos-integration/kubernetes/azure-….yml` |
| `cfi-testing/actions-config/gcp-kubernetes-finos.yaml` | `gcpKubernetes` | `../privateer-config/finos-integration/kubernetes/gcp-….yml` |

`path`: `modules/cloud-api-test/terraform/<cloud>` (kubernetes submodule). Expect longer apply times than VM/object-storage — document cluster boot budget in implementation skill.

Also plan README routing update for `@kubernetes` in `modules/features/README.md` during implementation (not this skill).

---

## Open questions

- Should factory/folder id be `kubernetes` (chosen here) or `k8s` to match catalog path literally?  Answer: kubernetes
- Is Kyverno/Gatekeeper required on all three CSP fixtures for CN04/CN05, or is native PSS + Azure Policy / Binary Authorization enough per cloud?  native.
- Which FINOS estate/platform will host `modules/probes/reachability`, and who owns its deployment, DNS, egress identity, secret rotation, and availability?  aws-test-infra
- Should remote reachability be mandatory `@MAIN` once the FINOS service is operational, while config-only remains `@SANITY`?  don't care - we'll run them all.
- CN04.AR02/AR03: block on signed/vuln-scanned image pipeline before marking Behavioural, or ship `@NotTestable` stubs first?  test should fail.
- CN18.AR02 on EKS: which node OS + feature combo is the supported integrity story for FINOS fixtures? don't care, choose your own for the integration tests.
- ~~Should CN14.AR01 v1 require only kube-apiserver audit export, with node/network logs deferred?~~ **Resolved: yes — v1 covers API audit / control-plane export only; node/workload/network log export is deferred (see CN14.AR01 scope note).**  

---

## Review checklist

- [x] Every native AR in `controls.yaml` appears in `analysis.md` (CN01–CN18, all ARs)
- [x] **Feature reuse from generic** table lists each imported Core control with path + tag-only vs new-file decision
- [x] No planned duplication of feature files that already exist under `modules/features/generic/`
- [x] Each behavioural AR has trigger + observation + fixtures
- [x] Interface methods minimal relative to AR count; prefer `AttemptAdmitWorkload` reuse; no `QueryLogs` on kubernetes service
- [x] AWS / Azure / GCP columns filled or marked unsupported with reason
- [x] Inherited Core ARs point at generic/shared features or justify new CN02 scenario
- [x] Subscription-init / alert / MFA / log-isolation ARs marked `@NotTestable` or Policy-deferred
- [x] Terraform fixtures use `finos-ccc-integration-k8s-*` naming
- [x] **Integration test coverage** table lists new methods + `expect_error` where honest
- [x] **Privateer config** split documented: finos-integration vs cloud-api-test
- [x] **actions-config** entries planned with terraform path
- [x] **Only** `modules/features/kubernetes/analysis.md` created — no placeholder READMEs, empty catalog dirs, or `.feature` files
