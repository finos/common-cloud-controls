# Behavioural test analysis: Virtual Machines

- **Catalog**: `catalogs/compute/virtual-machines/controls.yaml`
- **Catalog id**: `CCC.VM`
- **Features root**: `modules/features/virtual-machines/`
- **Cloud-api package**: `modules/cloud-api/virtual-machines/` (new)
- **Factory service id**: `virtual-machines`
- **Date**: 2026-05-27

## Summary

The VM catalog defines **no native** `CCC.VM.CN*` controls today (`control-families: []`). Behavioural coverage is entirely through **nine imported CCC.Core controls** (CN02, CN03, CN04, CN05, CN06, CN08, CN09, CN11, CN12). Of the underlying Core ARs, roughly **8–10 are candidates for behavioural or destructive tests** on a compute instance fixture; **CN03 (MFA)** and parts of **CN09/CN11** are account- or policy-layer and should be `@NotTestable` or deferred. **CN12** is referenced but not yet in `catalogs/core/ccc/controls.yaml` — definition taken from the ObjStor release embed (`CCC.Core.CN12.AR01`: deny unauthorized IP connection).

## Imported controls

| Reference | Action |
|-----------|--------|
| CCC.Core.CN02 | Service-specific feature: verify attached volume encryption at rest |
| CCC.Core.CN03 | `@NotTestable` — MFA is console/IAM-layer, not EC2/VM API |
| CCC.Core.CN04 | Service-specific features: admin + data-plane logging via `logging.QueryLogs` |
| CCC.Core.CN05 | Service-specific features: identity-scoped deny/allow on control-plane actions |
| CCC.Core.CN06 | Reuse pattern from `vpc/CCC.Core/CCC-Core-CN06-AR01.feature` with `@virtual-machines` tag |
| CCC.Core.CN08 | `@NotTestable` for primary VM disks — no object-storage-style replication API; optional future snapshot/DR check |
| CCC.Core.CN09 | `@NotTestable` — log sink isolation requires cross-account IAM/policy proofs |
| CCC.Core.CN11 | Mostly `@NotTestable` / policy — CMEK and key rotation are KMS/config inspection |
| CCC.Core.CN12 | Behavioural via network probe or SG-scoped connection attempt (may share `port/` harness) |

## Native assessment requirements

_None — catalog contains no `CCC.VM.CN*.AR*` entries._

---

## Assessment requirements (inherited Core)

### CCC.Core.CN02.AR01 — Encrypt data for storage

- **Requirement**: > When data is stored, it MUST be encrypted using the latest industry-standard encryption methods.
- **Disposition**: Behavioural
- **Applicability**: tlp-green, tlp-amber, tlp-red
- **Interpretation**: For VMs, “data is stored” maps to **EBS/OS disk volumes** attached to the instance under test, not ephemeral instance store unless that is the only disk.
- **Approach**:
  1. Use pre-provisioned compliant instance `{UID}` / `{ResourceName}` (terraform: encrypted root volume, CMK or AWS-managed key).
  2. Call `GetVolumeEncryptionStatus` for the instance.
  3. Assert all in-scope volumes report `Encrypted=true` and a non-empty `EncryptionAlgorithm` / `KMSKeyId` as applicable.
- **Feature sketch**:
  - Background: cloud api + `virtual-machines` service
  - When `GetVolumeEncryptionStatus` on `{UID}`
  - Then every volume in result has encryption fields populated
- **Config / fixtures**: Compliant instance with encrypted EBS; bad fixture optional (unencrypted volume) for negative config in `aws-vm-bad.yml`.
- **Gaps / honesty notes**: Does not prove encryption of in-memory data or instance store unless explicitly configured to test that volume type.

### CCC.Core.CN04.AR01 — Log administrative changes

- **Requirement**: > When administrative access or configuration change is attempted on the service or a child resource, the service MUST log the client identity, time, and result of the attempt.
- **Disposition**: Behavioural
- **Applicability**: all TLP levels
- **Approach**:
  1. Call `UpdateResourcePolicy` on the VM service (harmless tag or attribute change — e.g. flip a `CFITestTag` value).
  2. Wait ~10s.
  3. `logging.QueryLogs("{ResourceName}", "admin", 20)`.
  4. Assert log entries include identity + succeeded result (same table pattern as object-storage CN04.AR01).
- **Config / fixtures**: CloudTrail enabled (account-wide); no trail name discovery — rely on LookupEvents. Explicit region in privateer vars.
- **Gaps / honesty notes**: CloudTrail is account-scoped; filter client-side by resource ARN/instance id in event JSON.

### CCC.Core.CN04.AR02 — Log data modification attempts

- **Requirement**: > When any attempt is made to modify data on the service or a child resource, the service MUST log the client identity, time, and result of the attempt.
- **Disposition**: Behavioural
- **Applicability**: tlp-amber, tlp-red
- **Approach**:
  1. `TriggerDataWrite("{ResourceName}")` — VM interpretation: **control-plane data change** logged as data event if enabled (e.g. `PutObject` N/A); prefer **SSM RunCommand / user-data write** only if data events enabled — otherwise use **metadata/tag mutation** as pragmatic stand-in and document gap, OR enable CloudTrail data events for EC2 in fixture.
  2. Pragmatic v1: treat `ModifyInstanceAttribute` / tag update as the logged “modification” via admin trail if data events not enabled — note honesty gap vs literal “data on disk”.
  3. `QueryLogs(..., "data-write", ...)`.
- **Config / fixtures**: CloudTrail **data events** for EC2 must be enabled in terraform for strict AR mapping.
- **Gaps / honesty notes**: True disk write logging may require guest OS agent or data events — call out in feature comment.

### CCC.Core.CN04.AR03 — Log data read attempts

- **Requirement**: > When any attempt is made to read data on the service or a child resource, the service MUST log the client identity, time, and result of the attempt.
- **Disposition**: Behavioural (tlp-red only)
- **Applicability**: tlp-red
- **Approach**: Same as AR02 with read-class API (`DescribeInstances`, `GetConsoleOutput`) + `QueryLogs(..., "data-read", ...)`.
- **Gaps / honesty notes**: Read events are high-volume and often disabled by default — fixture must enable EC2 data read logging.

### CCC.Core.CN05.AR01 — Block unauthorized data modification

- **Requirement**: > When an attempt is made to modify data on the service or a child resource, the service MUST block requests from unauthorized entities.
- **Disposition**: Destructive + Behavioural
- **Approach**:
  1. `GetServiceAPIWithIdentity("virtual-machines", "testUserNoAccess", false)`.
  2. `AttemptInstanceModification("{UID}")` (e.g. stop instance or change tag).
  3. Assert `{result}` is an error.
- **Config / fixtures**: Pre-provisioned test identities in privateer vars (same pattern as object-storage).

### CCC.Core.CN05.AR02 — Block unauthorized administrative access

- **Requirement**: > When administrative access or configuration change is attempted on the service or a child resource, the service MUST refuse requests from unauthorized entities.
- **Disposition**: Destructive + Behavioural
- **Approach**: Same as AR01 — unauthorized identity attempts `AttemptInstanceModification`; authorized `testUserAdmin` succeeds (positive sanity, `@OPT_IN`).

### CCC.Core.CN06.AR01 — Resource location compliance

- **Requirement**: > When the service is running, its region and availability zone MUST be included in a list of explicitly trusted or approved locations within the trust perimeter.
- **Disposition**: Behavioural (inspection-shaped)
- **Approach**: `GetResourceRegion("{ResourceName}")` + assert in `{PermittedRegions}` (mirror vpc CN06 feature).
- **Config / fixtures**: `permitted-regions` in privateer config.

### CCC.Core.CN06.AR02 — Child resource location

- **Disposition**: Not testable (behavioural) for single-instance fixture unless test attaches a child ENI/disk explicitly — defer or `@NotTestable` with comment.

### CCC.Core.CN03.* — MFA

- **Disposition**: `@NotTestable` for all four ARs at VM API layer.

### CCC.Core.CN07.* — Enumeration alerts

- **Disposition**: `@NotTestable` (mirror `object-storage/CCC-Core-CN07-AR02.feature`).

### CCC.Core.CN08.* — Replication

- **Disposition**: `@NotTestable` — VM primary storage does not expose ObjStor-style `GetReplicationStatus`; cross-region AMI copy is policy/config.

### CCC.Core.CN09.* — Log integrity

- **Disposition**: `@NotTestable` — requires proving log sink isolation from compute role; future work with dedicated low-privilege identity.

### CCC.Core.CN11.* — Encryption keys

- **Disposition**: Policy / `@NotTestable` for rotation and CMEK enforcement; optional future read-only `GetVolumeEncryptionStatus` partial coverage for CMEK presence only.

### CCC.Core.CN12.AR01 — Deny unauthorized IP connection

- **Requirement**: > When an unauthorized IP or network attempts to connect to the service, the request MUST be denied.
- **Disposition**: Behavioural (cross-cutting with network)
- **Approach**:
  1. Instance in VPC with restrictive SG (allow only bastion CIDR).
  2. `AttemptInboundConnection("{UID}", port)` from test runner IP expected **outside** allow list → connection refused/timeout.
  3. Optional positive: connect from allowed CIDR succeeds.
- **Config / fixtures**: Known `allowed-source-cidr` and test runner egress IP or synthetic probe via `port/` service.
- **Gaps / honesty notes**: May delegate to `modules/features/port/` for TLS/TCP probes; VM service returns connection outcome only.

---

## Cloud-api interface (minimal)

### `virtualmachines.Service`

| Method | Used by AR(s) | Args | Returns (key fields) |
|--------|---------------|------|----------------------|
| `GetVolumeEncryptionStatus` | CN02.AR01 | `instanceID string` | `Volumes[]` with `Encrypted`, `EncryptionAlgorithm`, `KMSKeyId`, `VolumeId` |
| `AttemptInstanceModification` | CN05.AR01, CN05.AR02 | `instanceID string` | error or `{Modified, Action}` |
| `AttemptInboundConnection` | CN12.AR01 | `instanceID string`, `port int` | `{Connected, Error, RemoteAddr}` |

### `logging.Service`

| logType | AR(s) | resourceID meaning |
|---------|-------|-------------------|
| `admin` | CN04.AR01 | Instance id or Name tag |
| `data-write` | CN04.AR02 | Instance ARN/id |
| `data-read` | CN04.AR03 | Instance ARN/id |

### `generic.Service` methods used

| Method | AR(s) |
|--------|-------|
| `GetOrProvisionTestableResources` | all — discover tagged test instances |
| `GetResourceRegion` | CN06.AR01 |
| `UpdateResourcePolicy` | CN04.AR01 trigger |
| `TriggerDataWrite` | CN04.AR02 trigger (v1: tag/attribute change; document gap) |
| `CheckUserProvisioned` | identity scenarios |
| `TearDown` | no-op if no create |

**Method count: 3** service-specific (+ generic/logging). CN05 uses identity factory + `AttemptInstanceModification` only — no separate deny method.

---

## Cross-cloud implementation

### `GetVolumeEncryptionStatus`

#### AWS
- **API**: `ec2:DescribeVolumes` filtered by instance attachment; `ec2:DescribeInstanceAttribute` optional.
- **Notes**: Read `Encrypted`, `KmsKeyId` from volume; map algorithm to `aws/ebs` or KMS.
- **Config**: `region`, instance id from discovery tag `CFIControlSet=CCC.VM`.

#### Azure
- **API**: `Compute SDK` — `VirtualMachinesClient.Get`, disk resources via `DisksClient.Get`.
- **Notes**: Check `EncryptionSettingsCollection` / SSE with PMK/CMK on OS + data disks.
- **Config**: `azure-subscription-id`, `azure-resource-group`, `vm-name`.

#### GCP
- **API**: `compute.Instances.Get`, `compute.Disks.Get`.
- **Notes**: `diskEncryptionKey`, `sourceDiskEncryptionKey`; CMEK via `kmsKeyName`.
- **Config**: `gcp-project-id`, `zone`, instance name.

### `AttemptInstanceModification`

#### AWS
- **API**: `ec2:StopInstances` or `ec2:CreateTags` (non-destructive prefer tags for “good” instance).
- **Notes**: Unauthorized caller should receive `UnauthorizedOperation` / `AccessDenied`.

#### Azure
- **API**: `VirtualMachinesClient.BeginDeallocate` or `Update` tags.
- **Notes**: RBAC propagation retry (reuse `retry.IsAzureRBACPropagationError`).

#### GCP
- **API**: `instances.Stop` or `instances.SetLabels`.
- **Notes**: IAM deny on test user.

### `AttemptInboundConnection`

#### AWS
- **API**: TCP dial from test harness to instance `PublicIp`/`PrivateIp` + port (not AWS SDK — outbound from runner).
- **Notes**: SG must deny runner IP; document need for stable egress IP or in-VPC probe host.
- **Config**: `test-listener-port`, `allowed-source-cidr`.

#### Azure
- **API**: TCP dial to NIC public/private IP; NSG rules enforce deny.
- **Config**: `vm-hostname` or IP, `test-listener-port`.

#### GCP
- **API**: TCP dial to instance IP; VPC firewall rules.
- **Config**: `gcp-zone`, instance name, firewall rule name (explicit in vars — no discovery).

### `UpdateResourcePolicy` / `TriggerDataWrite` (generic)

#### AWS
- Flip tag `CFITestMarker` on instance; CloudTrail management/data events.

#### Azure
- Update VM tags or `tagsPatch` via Compute API.

#### GCP
- `instances.SetLabels` with label fingerprint.

### `logging.QueryLogs`

Reuse existing [`logging.Service`](../../modules/cloud-api/logging/logging.go) — CloudTrail / Activity Log / Cloud Audit Logs per existing implementations.

---

## Privateer config (planned vars)

| Var | Purpose | Example |
|-----|---------|---------|
| `service` | factory id | `virtual-machines` |
| `tags` | scenario filter | `@Behavioural @virtual-machines` |
| `instance-id` | fixture prefix | `20260527t120000z` |
| `provider` / `region` | cloud params | `aws`, `us-east-1` |
| `resource` | Name tag filter | `cfi-20260527t120000z-vm-good` |
| `permitted-regions` | CN06 | `[us-east-1]` |
| `test-listener-port` | CN12 | `22` or `8080` |
| `allowed-source-cidr` | CN12 positive path | `10.0.0.0/8` |
| `test-identities` | CN05 | same shape as object-storage |
| `aws-flow-log-group-name` | only if CN04 extended to VPC flow | — |

---

## Open questions

- Should CN12 live under `virtual-machines/` or extend `port/` with `@virtual-machines` tag?
- Does CN04.AR02 require guest-OS write (SSM) for strict “data on disk” wording, or is control-plane mutation acceptable v1?
- When will native `CCC.VM.CN*` controls be added to `controls.yaml`?
- CN12 definition should be promoted into `catalogs/core/ccc/controls.yaml` to avoid release-embed drift.

---

## Review checklist

- [x] Every native AR in catalog appears (none)
- [x] Each behavioural AR has approach + fixtures
- [x] Interface minimal (3 methods)
- [x] AWS / Azure / GCP filled per method
- [x] Inherited Core ARs classified
- [x] MFA / subscription-init not falsely marked Behavioural
