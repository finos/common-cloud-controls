# Behavioural test analysis: Virtual Machines

- **Catalog**: `catalogs/compute/virtual-machines/controls.yaml`
- **Catalog id**: `CCC.VM`
- **Features root**: `modules/features/virtual-machines/`
- **Shared features root**: `modules/features/generic/` (primary source for inherited Core)
- **Cloud-api package**: `modules/cloud-api/virtual-machines/` (new)
- **Factory service id**: `virtual-machines`
- **Date**: 2026-05-27

## Summary

The VM catalog defines **no native** `CCC.VM.CN*` controls today (`control-families: []`). Behavioural coverage is entirely through **nine imported CCC.Core controls** (CN02, CN03, CN04, CN05, CN06, CN08, CN09, CN11, CN12).

**Most inherited Core ARs reuse existing scenarios in `modules/features/generic/`** — implementation adds `@virtual-machines` tags (and `{service-type}` = `virtual-machines` in privateer config) rather than copying feature files into `virtual-machines/CCC.Core/`. Only **CN02** (volume encryption) and **CN12** (unauthorized IP connection) need new or extended scenarios under `virtual-machines/` or `port/`. **CN03, CN07, CN08, CN09, CN10, CN11** are `@NotTestable` at the VM API layer; extend the existing generic `@NotTestable` stubs with `@virtual-machines`.

Planned service-specific interface: **2–3 methods** (+ `generic.Service` + `logging.Service`).

## Feature reuse from generic

During implementation, **prefer tagging over duplication**. Inventory `modules/features/generic/CCC.Core/` before creating any new Core feature file.

| Core control | Generic feature | VM action |
|--------------|-----------------|-----------|
| CN03 (MFA) | `generic/CCC.Core/CCC-Core-CN03-AR01.feature` | Add `@virtual-machines` to `@NotTestable` scenario |
| CN04.AR01 | `generic/CCC.Core/CCC-Core-CN04-AR01.feature` | Add `@virtual-machines`; uses `{service-type}` + `UpdateResourcePolicy` + `logging.QueryLogs` |
| CN04.AR02 | `generic/CCC.Core/CCC-Core-CN04-AR02.feature` | Add `@virtual-machines`; uses `TriggerDataWrite` |
| CN04.AR03 | `generic/CCC.Core/CCC-Core-CN04-AR03.feature` | Add `@virtual-machines`; uses `TriggerDataRead` |
| CN05.AR06 | `generic/CCC.Core/CCC-Core-CN05-AR06.feature` | Add `@virtual-machines`; uses `{service-type}` + `TriggerDataRead` — covers unauthorized **read**; extend same file for AR01/AR02 write/admin deny using `TriggerDataWrite` / `UpdateResourcePolicy` with `{service-type}` (do not copy object-storage `CreateObject` patterns) |
| CN07.AR01 / AR02 | `generic/CCC.Core/CCC-Core-CN07-AR0*.feature` | Add `@virtual-machines` to `@NotTestable` scenarios |
| CN10.AR01 | `generic/CCC.Core/CCC-Core-CN10-AR01.feature` | Add `@virtual-machines` to `@NotTestable` scenario |
| CN01 (TLS/SSH/ports) | `generic/CCC.Core/CCC-Core-CN01-AR*.feature` | Add `@virtual-machines` on `@PerPort` scenarios where the VM fixture exposes SSH (22) or other probed ports — routed to `port/` per README |
| CN06.AR01 | `vpc/CCC.Core/CCC-Core-CN06-AR01.feature` | Add `@virtual-machines`; uses `GetResourceRegion` (already generic) |

**New or extended scenarios only where generic steps do not fit:**

| AR | Location | Why not generic-only |
|----|----------|----------------------|
| CN02.AR01 | `virtual-machines/CCC.Core/CCC-Core-CN02-AR01.feature` (new) | Needs `GetVolumeEncryptionStatus` — disk/volume inspection, not on `generic.Service` |
| CN12.AR01 | `virtual-machines/CCC.Core/` or `port/` with `@virtual-machines` | Network connection probe to instance IP + SG/NSG/firewall — may share `port/` TCP harness |
| CN05.AR01 / AR02 | Extend `generic/.../CCC-Core-CN05-AR06.feature` or sibling in generic | Unauthorized write/admin via `TriggerDataWrite` / `UpdateResourcePolicy` + identity factory — same shape as generic, not ObjStor `CreateBucket` |

Do **not** create `virtual-machines/CCC.Core/` copies of CN03, CN04, CN07, or CN10 — those files already live in `generic/`.

## Imported controls

| Reference | Action |
|-----------|--------|
| CCC.Core.CN02 | **New** service-specific feature — `GetVolumeEncryptionStatus` on attached volumes |
| CCC.Core.CN03 | Reuse `generic/CCC-Core-CN03-AR01.feature` — add `@virtual-machines` to `@NotTestable` |
| CCC.Core.CN04 | Reuse `generic/CCC-Core-CN04-AR0*.feature` — add `@virtual-machines`; implement `UpdateResourcePolicy`, `TriggerDataWrite`, `TriggerDataRead` on VM service |
| CCC.Core.CN05 | Extend generic CN05 features with `@virtual-machines` + `{service-type}`; identity-scoped `TriggerDataWrite` / `UpdateResourcePolicy` |
| CCC.Core.CN06 | Reuse `vpc/CCC-Core-CN06-AR01.feature` — add `@virtual-machines`; `GetResourceRegion` only |
| CCC.Core.CN08 | `@NotTestable` — no generic feature yet; optional stub in generic when CN08 is centralized |
| CCC.Core.CN09 | `@NotTestable` — log sink isolation requires cross-account IAM/policy proofs |
| CCC.Core.CN11 | `@NotTestable` — CMEK and key rotation are KMS/config inspection |
| CCC.Core.CN12 | **New** scenario — inbound connection probe (`AttemptInboundConnection` or `port/` harness) |

## Native assessment requirements

_None — catalog contains no `CCC.VM.CN*.AR*` entries._

---

## Assessment requirements (inherited Core)

### CCC.Core.CN02.AR01 — Encrypt data for storage

- **Requirement**: > When data is stored, it MUST be encrypted using the latest industry-standard encryption methods.
- **Disposition**: Behavioural
- **Applicability**: tlp-green, tlp-amber, tlp-red
- **Reuse**: **None** — only AR that requires a new feature file under `virtual-machines/CCC.Core/`.
- **Interpretation**: For VMs, “data is stored” maps to **EBS/OS disk volumes** attached to the instance under test, not ephemeral instance store unless that is the only disk.
- **Approach**:
  1. Use pre-provisioned compliant instance `{uid}` / `{resource-name}` (terraform: encrypted root volume, CMK or AWS-managed key).
  2. Call `GetVolumeEncryptionStatus` for the instance.
  3. Assert all in-scope volumes report `Encrypted=true` and a non-empty `EncryptionAlgorithm` / `KMSKeyId` as applicable.
- **Feature sketch**:
  - Background: cloud api + `virtual-machines` service
  - When `GetVolumeEncryptionStatus` on `{uid}`
  - Then every volume in result has encryption fields populated
- **Config / fixtures**: Compliant instance with encrypted EBS; bad fixture optional (unencrypted volume) for negative config in `aws-vm-bad.yml`.
- **Gaps / honesty notes**: Does not prove encryption of in-memory data or instance store unless explicitly configured to test that volume type.

### CCC.Core.CN04.AR01 — Log administrative changes

- **Disposition**: Behavioural — **reuse** `generic/CCC.Core/CCC-Core-CN04-AR01.feature`
- **VM implementation notes**: `UpdateResourcePolicy` flips a harmless tag (e.g. `CFITestMarker`) on the instance; CloudTrail management events. Filter client-side by instance ARN/id. Explicit region in privateer vars.

### CCC.Core.CN04.AR02 — Log data modification attempts

- **Disposition**: Behavioural — **reuse** `generic/CCC.Core/CCC-Core-CN04-AR02.feature`
- **VM implementation notes**: v1 `TriggerDataWrite` = tag/attribute mutation; strict mapping requires CloudTrail **data events** for EC2 in fixture. Document gap vs literal “data on disk” in feature comment if data events not enabled.

### CCC.Core.CN04.AR03 — Log data read attempts

- **Disposition**: Behavioural (tlp-red) — **reuse** `generic/CCC.Core/CCC-Core-CN04-AR03.feature`
- **VM implementation notes**: `TriggerDataRead` via describe/get-console-output class APIs; fixture must enable EC2 data read logging.

### CCC.Core.CN05.AR01 — Block unauthorized data modification

- **Disposition**: Destructive + Behavioural — **extend generic CN05** (same pattern as `CCC-Core-CN05-AR06.feature`)
- **Approach**: `GetServiceAPIWithIdentity("{service-type}", "test-user-no-access")` + `TriggerDataWrite("{resource-name}")` → assert error. Positive path with `test-user-write` optional `@OPT_IN`.

### CCC.Core.CN05.AR02 — Block unauthorized administrative access

- **Disposition**: Destructive + Behavioural — **extend generic CN05**
- **Approach**: Unauthorized identity + `UpdateResourcePolicy` → error; `test-user-admin` succeeds (positive sanity, `@OPT_IN`).

### CCC.Core.CN06.AR01 — Resource location compliance

- **Disposition**: Behavioural — **reuse** `vpc/CCC.Core/CCC-Core-CN06-AR01.feature` with `@virtual-machines`
- **Approach**: `GetResourceRegion("{resource-name}")` + assert in `{permitted-regions}`. No VM-specific cloud-api method.

### CCC.Core.CN06.AR02 — Child resource location

- **Disposition**: `@NotTestable` for single-instance fixture unless test attaches a child ENI/disk explicitly.

### CCC.Core.CN03.* — MFA

- **Disposition**: `@NotTestable` — reuse `generic/CCC-Core-CN03-AR01.feature`; add `@virtual-machines`.

### CCC.Core.CN07.* — Enumeration alerts

- **Disposition**: `@NotTestable` — reuse `generic/CCC-Core-CN07-AR0*.feature`; add `@virtual-machines`.

### CCC.Core.CN08.* — Replication

- **Disposition**: `@NotTestable` — VM primary storage does not expose ObjStor-style `GetReplicationStatus`; cross-region AMI copy is policy/config.

### CCC.Core.CN09.* — Log integrity

- **Disposition**: `@NotTestable` — requires proving log sink isolation from compute role.

### CCC.Core.CN11.* — Encryption keys

- **Disposition**: `@NotTestable` — CMEK enforcement and key rotation are KMS/config inspection; CN02 covers at-rest presence only.

### CCC.Core.CN12.AR01 — Deny unauthorized IP connection

- **Requirement**: > When an unauthorized IP or network attempts to connect to the service, the request MUST be denied.
- **Disposition**: Behavioural (cross-cutting with network)
- **Reuse**: Partial — generic has no CN12 feature; may share TCP probe steps with `port/` (`@PerPort`).
- **Approach**:
  1. Instance in VPC with restrictive SG (allow only bastion CIDR).
  2. `AttemptInboundConnection("{uid}", port)` from test runner IP expected **outside** allow list → connection refused/timeout.
  3. Optional positive: connect from allowed CIDR succeeds.
- **Config / fixtures**: Known `allowed-source-cidr`, `test-listener-port`, test runner egress IP or in-VPC probe host.
- **Gaps / honesty notes**: CN12 is referenced in VM catalog but not yet in `catalogs/core/ccc/controls.yaml` — definition from ObjStor release embed.

---

## Cloud-api interface (minimal)

Most inherited Core ARs need **no new methods** — they use existing [`generic.Service`](../../cloud-api/generic/service.go) and [`logging.Service`](../../cloud-api/logging/logging.go).

### `virtualmachines.Service`

| Method | Used by AR(s) | Args | Returns (key fields) |
|--------|---------------|------|----------------------|
| `GetVolumeEncryptionStatus` | CN02.AR01 | `instanceID string` | `Volumes[]` with `Encrypted`, `EncryptionAlgorithm`, `KMSKeyId`, `VolumeId` |
| `AttemptInboundConnection` | CN12.AR01 | `instanceID string`, `port int` | `{Connected, Error, RemoteAddr}` |

Optional: fold CN05 into `TriggerDataWrite` / `UpdateResourcePolicy` on the embedded `generic.Service` implementation — **do not** add `AttemptInstanceModification` unless a single generic method cannot express both write and admin denial.

### `logging.Service`

| logType | AR(s) | resourceID meaning |
|---------|-------|-------------------|
| `admin` | CN04.AR01 | Instance id or Name tag |
| `data-write` | CN04.AR02 | Instance ARN/id |
| `data-read` | CN04.AR03 | Instance ARN/id |

### `generic.Service` methods used (inherited Core — no new interface methods)

| Method | AR(s) | Generic feature |
|--------|-------|-----------------|
| `GetOrProvisionTestableResources` | all | — |
| `GetResourceRegion` | CN06.AR01 | `vpc/CCC-Core-CN06-AR01` |
| `UpdateResourcePolicy` | CN04.AR01, CN05.AR02 | `generic/CCC-Core-CN04-AR01`, CN05 extension |
| `TriggerDataWrite` | CN04.AR02, CN05.AR01 | `generic/CCC-Core-CN04-AR02`, CN05 extension |
| `TriggerDataRead` | CN04.AR03, CN05.AR06 | `generic/CCC-Core-CN04-AR03`, `CCC-Core-CN05-AR06` |
| `CheckUserProvisioned` | identity scenarios | — |
| `TearDown` | — | no-op if no create |

**Method count: 2** service-specific (`GetVolumeEncryptionStatus`, `AttemptInboundConnection`) + generic/logging embed.

---

## Cross-cloud implementation

### `GetVolumeEncryptionStatus`

#### AWS
- **API**: `ec2:DescribeVolumes` filtered by instance attachment.
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

### `UpdateResourcePolicy` / `TriggerDataWrite` / `TriggerDataRead` (generic embed)

#### AWS
- Tag flip on instance; CloudTrail management/data events per log type.

#### Azure
- Update VM tags via Compute API; Activity Log queries.

#### GCP
- `instances.SetLabels` with label fingerprint; Cloud Audit Logs.

### `logging.QueryLogs`

Reuse existing [`logging.Service`](../../cloud-api/logging/logging.go) — CloudTrail / Activity Log / Cloud Audit Logs per existing implementations.

---

## Privateer config (planned vars)

| Var | Purpose | Example |
|-----|---------|---------|
| `service` | factory id | `virtual-machines` |
| `ServiceType` | generic feature `{service-type}` | `virtual-machines` |
| `tags` | scenario filter | `@Behavioural @virtual-machines` |
| `resource` | Resource filter (Name tag, container, …) | `cfi-20260527t120000z-vm-good` |
| `provider` / `region` | cloud params | `aws`, `us-east-1` |
| `permitted-regions` | CN06 | `[us-east-1]` |
| `test-listener-port` | CN12 | `22` or `8080` |
| `allowed-source-cidr` | CN12 positive path | `10.0.0.0/8` |
| `hostName` / `portNumber` | CN01 @PerPort (SSH) | instance public IP, `22` |
| `test-identities` | CN05 | same shape as object-storage |

---

## Open questions

- Should CN12 live under `virtual-machines/` or extend `port/` with `@virtual-machines` tag?
- Does CN04.AR02 require guest-OS write (SSM) for strict “data on disk” wording, or is control-plane mutation acceptable v1?
- When will native `CCC.VM.CN*` controls be added to `controls.yaml`?
- Should CN06 move from `vpc/` to `generic/` now that multiple services reuse it?
- CN12 definition should be promoted into `catalogs/core/ccc/controls.yaml` to avoid release-embed drift.

---

## Review checklist

- [x] Every native AR in catalog appears (none)
- [x] Generic reuse table maps each inherited Core AR to existing feature or new-only path
- [x] No duplicate `virtual-machines/CCC.Core/` planned for ARs already in `generic/`
- [x] Each behavioural AR has approach + fixtures
- [x] Interface minimal (2 service-specific methods; CN05 via generic embed)
- [x] AWS / Azure / GCP filled per method
- [x] Inherited Core ARs classified
- [x] MFA / subscription-init not falsely marked Behavioural
