# Behavioural test analysis: Key Management

- **Catalog**: `catalogs/crypto/key/controls.yaml`
- **Catalog id**: `CCC.KeyMgmt`
- **Features root**: `modules/features/key-management/`
- **Shared features root**: `modules/features/generic/` (primary source for inherited Core)
- **Cloud-api package**: `modules/cloud-api/key-management/` (new)
- **Factory service id**: `key-management`
- **Date**: 2026-06-08
- **MP release**: [CCC.KeyMgmt_v2025.07-MP.yaml](../../../website/src/data/ccc-releases/CCC.KeyMgmt_v2025.07-MP.yaml)

## Summary

The Key Management catalog defines **four native controls** with **four ARs** plus **seven imported CCC.Core controls** (CN01, CN02, CN03, CN04, CN05, CN06, CN10). Of the native ARs, **two are not testable in CI** (CN01 alert delivery, CN03 rotation config scan). **CN04** is **behavioural on the deny path**: attempt import of non-compliant key material and expect rejection. Proving successful import from a **certified HSM** remains out of scope. **CN02** is a **policy/config audit** — borderline describe-only.

Inherited Core coverage is mostly **tag-only reuse** in `generic/` (CN03 MFA, CN04 logging, CN05 access deny, CN06 region, CN10 replication). **Core CN02** (encryption at rest) and **Core CN01** (TLS) need service-specific interpretation because the resource under test *is* the key — plan **one new feature** under `key-management/CCC.Core/` for key specification, not volume-style encryption.

Planned service-specific interface: **3–4 methods** plus `generic.Service` embed and `logging.Service` for Core CN04 logging. No `GetKeyRotationStatus` — CN03 is `@NotTestable`.

## Feature reuse from generic

| Core control | Generic (or shared) feature | Action for this service |
|--------------|----------------------------|-------------------------|
| CCC.Core.CN03 | `generic/CCC.Core/CCC-Core-CN03-AR01.feature` | Add `@key-management` to `@NotTestable` scenario |
| CCC.Core.CN04.AR01 | `generic/CCC.Core/CCC-Core-CN04-AR01.feature` | Add `@key-management`; `UpdateResourcePolicy` + `logging.QueryLogs` (`admin`) |
| CCC.Core.CN04.AR02 | `generic/CCC.Core/CCC-Core-CN04-AR02.feature` | Add `@key-management`; `TriggerDataWrite` (encrypt probe) + `logging.QueryLogs` (`data-write`) |
| CCC.Core.CN04.AR03 | `generic/CCC.Core/CCC-Core-CN04-AR03.feature` | Add `@key-management`; `TriggerDataRead` (describe/decrypt probe) + `logging.QueryLogs` (`data-read`) |
| CCC.Core.CN05.AR06 | `generic/CCC.Core/CCC-Core-CN05-AR06.feature` | Add `@key-management`; extend for AR01/AR02 via `TriggerDataWrite` / `UpdateResourcePolicy` with identity factory |
| CCC.Core.CN06.AR01 | `vpc/CCC.Core/CCC-Core-CN06-AR01.feature` | Add `@key-management`; `GetResourceRegion` |
| CCC.Core.CN10.AR01 | `generic/CCC.Core/CCC-Core-CN10-AR01.feature` | Add `@key-management` to `@NotTestable` scenario |
| CCC.Core.CN01.* | `generic/CCC.Core/CCC-Core-CN01-AR*.feature` | Add `@key-management` on `@PerPort` only if a probed TLS endpoint exists — **unlikely for KMS API**; default `@NotTestable` stub comment |

**New-only scenarios (native + Core CN02):**

| AR | Planned feature path | Why not generic-only |
|----|----------------------|----------------------|
| CCC.KeyMgmt.CN02.AR01 | `key-management/CCC.KeyMgmt/CCC-KeyMgmt-CN02-AR01.feature` | Policy principal audit — `GetDecryptPrincipalAllowList` (config scan, not runtime trigger) |
| CCC.KeyMgmt.CN03.AR01 | `key-management/CCC.KeyMgmt/CCC-KeyMgmt-CN03-AR01.feature` | `@NotTestable` stub only — rotation interval is configuration scanning |
| CCC.KeyMgmt.CN04.AR01 | `key-management/CCC.KeyMgmt/CCC-KeyMgmt-CN04-AR01.feature` | Negative import probes — `AttemptImportKey` with weak/invalid material |
| CCC.Core.CN02.AR01 | `key-management/CCC.Core/CCC-Core-CN02-AR01.feature` | Key spec / algorithm — `GetKeySpecification` (not volume encryption) |

## Imported controls

| Reference | Action |
|-----------|--------|
| CCC.Core.CN01 | `@NotTestable` at KMS layer (provider APIs are HTTPS); optional `@PerPort` only if future fixture exposes custom endpoint |
| CCC.Core.CN02 | **New** `GetKeySpecification` — approved algorithm and key origin |
| CCC.Core.CN03 | Reuse `generic/CCC-Core-CN03-AR01.feature` — `@NotTestable` |
| CCC.Core.CN04 | Reuse `generic/CCC-Core-CN04-AR0*.feature` — implement generic embed triggers on key resource |
| CCC.Core.CN05 | Extend generic CN05 — identity-scoped encrypt/decrypt/policy deny |
| CCC.Core.CN06 | Reuse `vpc/CCC-Core-CN06-AR01.feature` — `GetResourceRegion` |
| CCC.Core.CN10 | Reuse `generic/CCC-Core-CN10-AR01.feature` — `@NotTestable` (keys are not object-replicated) |

---

## Assessment requirements (native)

### CCC.KeyMgmt.CN01.AR01 — Alert on key-version disable or deletion schedule

- **Requirement**: > When a key version is scheduled for deletion or disabled, an alert MUST be generated within five minutes.
- **Disposition**: Not testable
- **Applicability**: tlp-amber, tlp-red
- **Interpretation**: Requires incident-response channel delivery (PagerDuty, email, SNS subscription) within a five-minute SLA — outside cloud-api integration scope.
- **Approach**: `@NotTestable` stub in `key-management/CCC.KeyMgmt/` referencing native control; optional future metric-alarm *existence* describe if product demands policy-only proof.
- **Config / fixtures**: N/A for behavioural CI.
- **Gaps / honesty notes**: Can describe that EventBridge/Monitor/Alerting rules exist in terraform — that proves *configuration*, not alert *delivery* within five minutes.

### CCC.KeyMgmt.CN02.AR01 — Decrypt limited to authorised principals

- **Requirement**: > When IAM roles and key policies are reviewed, Decrypt permission MUST be granted exclusively to documented authorised principals.
- **Disposition**: Behavioural (describe / audit)
- **Applicability**: tlp-green
- **Interpretation**: Periodic policy review maps to an observable allow-list on the key: principals with `kms:Decrypt` / `decrypt` / `cryptoKeyVersions.useToDecrypt` must match terraform-documented set — no wildcards beyond expected runner + admin roles.
- **Approach**:
  1. Good fixture: CMK/key with tight key policy + IAM; terraform outputs `authorized-decrypt-principals` JSON array.
  2. `GetDecryptPrincipalAllowList("{uid}")` → compare sorted sets (allow runner SA, deny `*` principal on good fixture).
  3. Optional bad fixture key with `Principal: *` decrypt for negative config scan (not required in v1 integration CSV).
- **Feature sketch**:
  - When `GetDecryptPrincipalAllowList` on `{uid}`
  - Then result equals configured `authorized-decrypt-principals` (subset check, no unexpected principals).
- **Config / fixtures**: `resource`, `authorized-decrypt-principals`; bad key optional in separate privateer config.
- **Gaps / honesty notes**: Does not replace human policy review cadence — proves static policy state at test time only.

### CCC.KeyMgmt.CN03.AR01 — Automatic rotation within 365 days

- **Requirement**: > When rotation settings are examined, rotation MUST be enabled with an interval not exceeding 365 days.
- **Disposition**: Not testable
- **Applicability**: tlp-green
- **Interpretation**: The AR trigger is **examination of rotation settings** (configuration scan / periodic compliance review), not an observable runtime event. Proving `RotationEnabled` and `RotationPeriodDays≤365` via `DescribeKey` is policy attestation — same class as CN01’s “alert must fire” or subscription-init invariants.
- **Approach**: `@NotTestable` stub in `key-management/CCC.KeyMgmt/CCC-KeyMgmt-CN03-AR01.feature` with comment pointing to external config scanning (e.g. Cloud Custodian, Prowler, terraform plan) if teams need MP narrative.
- **Config / fixtures**: Terraform should still enable rotation on the good key for **fixture hygiene** and to support other keys’ encryption story — but that is not a behavioural test of this AR.
- **Gaps / honesty notes**: Does not prove rotation **executed** on schedule — only that a scanner could read settings. Asymmetric keys may use manual rotation; cross-cloud rotation models differ (AWS automatic vs Azure/GCP policy objects).

### CCC.KeyMgmt.CN04.AR01 — Validate imported keys

- **Requirement**: > When a key import request is processed, the key MUST use an approved algorithm (RSA-2048+, EC-P256+) and originate from a certified HSM.
- **Disposition**: Behavioural (negative) + honesty gap on positive HSM attestation
- **Applicability**: tlp-green
- **Interpretation**: The control objective is to **reject** weak or improperly provenanced imports. We can behaviourally prove enforcement by submitting import requests that **fail** the bar (undersized RSA, weak EC curve, corrupt/invalid wrapping) and observing API rejection. Proving that a **successful** import came from a certified HSM still requires hardware and attestation workflow outside CI.
- **Approach**:
  1. Terraform provisions an **import slot** key (`Origin=EXTERNAL` / GCP import-capable crypto key / Azure BYOK-capable key) — no material loaded.
  2. `AttemptImportKey("{import-slot-id}", importProfile)` with profiles such as `rsa-1024`, `ec-p192`, `rsa-2048-invalid-wrapping` → expect error / `AccessDenied` / validation failure.
  3. Optional `@OPT_IN` positive import only where cloud + HSM fixture exists (out of v1 scope).
- **Feature sketch**:
  - Background: `key-management` service; `import-slot` from config.
  - Scenario A (@MAIN): weak algorithm import → denied.
  - Scenario B (@MAIN): valid size but invalid wrapping / non-HSM blob → denied.
  - Comment scenario: certified-HSM success path `@NotTestable` without attestation fixture.
- **Config / fixtures**: `import-slot-key-id`, `weak-import-profiles` (list); test vectors generated in harness (OpenSSL-generated RSA-1024 wrapped per cloud import spec) — not checked into repo as live secrets.
- **Gaps / honesty notes**:
  - Proves **reject bad imports**, not that all approved imports were HSM-attested.
  - Azure BYOK and GCP import wire formats differ from AWS `ImportKeyMaterial` — may need one profile per cloud; mark unsupported cells if a cloud cannot reject a given weak profile via public API.

---

## Assessment requirements (inherited Core — summary)

### CCC.Core.CN02.AR01 — Encrypt data for storage

- **Disposition**: Behavioural — **new** `key-management/CCC.Core/CCC-Core-CN02-AR01.feature`
- **Interpretation**: For KMS, “stored data” is **key material metadata**: symmetric key or RSA/EC spec, HSM protection level, not application ciphertext.
- **Approach**: `GetKeySpecification` → `Algorithm` in approved set (`SYMMETRIC_DEFAULT`, `RSA_2048`, `RSA_3072`, `RSA_4096`, `EC_P256`, …), `ProtectionLevel` = `HSM` or `SOFTWARE` per fixture design.
- **Gaps**: Does not prove all data encrypted *with* the key across the estate — only the key object itself.

### CCC.Core.CN04.AR01–AR03 — Logging

- **Disposition**: Behavioural — **reuse generic** with `@key-management`
- **Implementation notes**:
  - `UpdateResourcePolicy`: harmless key policy / key vault access policy description or tag change.
  - `TriggerDataWrite`: `Encrypt` with test plaintext (logged as cryptographic operation).
  - `TriggerDataRead`: `DescribeKey` or `GetKey` (admin/data read classification per cloud audit taxonomy).
  - `logging.QueryLogs` with explicit trail/workspace/sink vars — filter by key ARN/resource name client-side.

### CCC.Core.CN05 — Unauthorized access

- **Disposition**: Destructive + Behavioural — **extend generic CN05**
- **Implementation notes**: `test-user-no-access` attempts `TriggerDataRead` (decrypt) and `UpdateResourcePolicy` → expect error. Do not use `ProvisionUserWithAccess`.

### CCC.Core.CN06.AR01 — Region compliance

- **Disposition**: Behavioural — **reuse** `vpc/CCC.Core/CCC-Core-CN06-AR01.feature` with `@key-management`; `GetResourceRegion` returns key region/location.

### CCC.Core.CN01, CN03, CN07, CN10

- **Disposition**: `@NotTestable` stubs (extend generic where files exist).

---

## Cloud-api interface (minimal)

### `key-management.Service`

Embeds `generic.Service`; adds:

| Method | Used by AR(s) | Args | Returns (key fields) |
|--------|---------------|------|----------------------|
| `GetDecryptPrincipalAllowList` | KeyMgmt.CN02.AR01 | `keyID string` | `Principals []string` |
| `AttemptImportKey` | KeyMgmt.CN04.AR01 | `keyID string`, `importProfile string` | error on rejected import (weak algo, bad wrap, missing attestation) |
| `GetKeySpecification` | Core.CN02.AR01 | `keyID string` | `Algorithm string`, `KeyType string`, `ProtectionLevel string`, `KeyUsage string` |
| `AttemptDecrypt` | Core.CN05 (optional explicit) | `keyID string`, `ciphertext []byte` | `Plaintext []byte` or error — **optional** if `TriggerDataRead` with identity factory suffices |

**Prefer** identity-scoped `TriggerDataRead` (decrypt path) over a separate `AttemptDecrypt` unless step clarity requires it.

### `logging.Service`

| logType | AR(s) | resourceID meaning |
|---------|-------|-------------------|
| `admin` | Core.CN04.AR01 | Key ARN / vault key name |
| `data-write` | Core.CN04.AR02 | Key ARN (encrypt events) |
| `data-read` | Core.CN04.AR03 | Key ARN (describe/decrypt events) |

### `generic.Service` methods used

| Method | AR(s) |
|--------|-------|
| `GetOrProvisionTestableResources` | Background |
| `CheckUserProvisioned` | Identity sanity |
| `UpdateResourcePolicy` | CN04.AR01, CN05.AR02 |
| `TriggerDataWrite` | CN04.AR02 (encrypt probe) |
| `TriggerDataRead` | CN04.AR03, CN05.AR06 |
| `GetResourceRegion` | CN06.AR01 |
| `TearDown` | no-op |

**Method count: 3–4** service-specific + generic embed (no rotation describe method).

---

## Cross-cloud implementation

### `GetDecryptPrincipalAllowList`

#### AWS
- **API**: `kms:GetKeyPolicy` + IAM policy simulator optional; parse `Statement` with `kms:Decrypt`.
- **Config**: `authorized-decrypt-principals` from terraform.

#### Azure
- **API**: Key Vault access policies or RBAC assignments filtered to decrypt/data-plane read actions.
- **Config**: vault URI, key name, expected principal object ids.

#### GCP
- **API**: `cryptoKeys.getIamPolicy` — roles with `cloudkms.cryptoKeyVersions.useToDecrypt`.
- **Config**: project, location, key ring, key id.

### `AttemptImportKey`

#### AWS
- **API**: `kms:ImportKeyMaterial` on a CMK with `Origin=EXTERNAL` (import slot from `CreateKey`).
- **Weak probes**: RSA-1024 key material wrapped per [AWS import spec](https://docs.aws.amazon.com/kms/latest/developerguide/importing-keys.html) → expect `InvalidImportTokenException` / `KMSInvalidStateException` / validation error.
- **Config**: `import-slot-key-id` from terraform.

#### Azure
- **API**: Key Vault / Managed HSM BYOK import (`import` key operation).
- **Weak probes**: undersized RSA blob or invalid `kid` wrapping → expect `BadParameter` / import rejected.
- **Gaps**: Standard Key Vault vs M-HSM import paths differ — document which fixture tier v1 uses.

#### GCP
- **API**: `ImportCryptoKeyVersion` with `algorithm` and wrapped key material.
- **Weak probes**: `RSA_1024` or malformed `ImportJob` payload → expect `INVALID_ARGUMENT` / failed precondition.

### `GetKeySpecification`

#### AWS
- **API**: `kms:DescribeKey` → `KeySpec`, `KeyUsage`, `Origin`, `CustomerMasterKeySpec`.

#### Azure
- **API**: Key Vault `Get Key` — `kty`, `key_size`, `crv`.

#### GCP
- **API**: `cryptoKeys.get` — `purpose`, `versionTemplate.algorithm`, `protectionLevel`.

### `TriggerDataWrite` / `TriggerDataRead` / `UpdateResourcePolicy`

#### AWS
- Encrypt: `kms:Encrypt`; Read: `kms:Decrypt` or `kms:DescribeKey`; Policy: `kms:PutKeyPolicy` sid/description bump (restore in `ResetAccess`).

#### Azure
- Encrypt/decrypt via Key Vault crypto API; Policy: access policy / RBAC metadata change.

#### GCP
- `encrypt` / `decrypt` / `cryptoKeys.get`; Policy: IAM binding or labels change.

---

## Terraform fixtures (planned)

| Fixture name | Role | AR(s) | Cloud(s) |
|--------------|------|-------|----------|
| `finos-ccc-integration-key-main` | compliant CMK with rotation enabled (hygiene) + tight decrypt policy | CN02, Core CN02/CN04/CN05/CN06 | aws, azure, gcp |
| `finos-ccc-integration-key-import` | empty import slot (external origin, no material) | KeyMgmt.CN04 | aws, azure, gcp |
| `finos-ccc-integration-key-bad` (optional) | overly broad decrypt policy | CN02 negative (optional) | aws |

Submodule path: `modules/cloud-api-test/terraform/<cloud>/modules/key-management/` (new).

| Output | Purpose |
|--------|---------|
| `key_id` / `key_arn` | `resource` var |
| `authorized_decrypt_principals` | CN02 expected allow-list |
| `import_slot_key_id` | KeyMgmt.CN04 import target |
| `key_ring` / `vault_name` | provider-specific config |

---

## Integration test coverage (planned)

| api | method | cloud | expect_error | arg1 | Notes |
|-----|--------|-------|--------------|------|-------|
| `key-management` | `GetDecryptPrincipalAllowList` | all | | `finos-ccc-integration-key-main` | CN02 (config audit) |
| `key-management` | `GetKeySpecification` | all | | `finos-ccc-integration-key-main` | Core CN02 |
| `key-management` | `AttemptImportKey` | all | true | `finos-ccc-integration-key-import` | `rsa-1024` | KeyMgmt.CN04 weak algo |
| `key-management` | `AttemptImportKey` | all | true | `finos-ccc-integration-key-import` | `invalid-wrapping` | KeyMgmt.CN04 bad material |
| `key-management` | `TriggerDataRead` | all | true | `finos-ccc-integration-key-main` | via `test-user-no-access` identity (CN05) — separate identity-scoped test harness row if needed |
| `logging` | `QueryLogs` | all | | key resource, `admin`, `60` | Core CN04.AR01 |

---

## Privateer config (planned vars)

### Behavioural (`cfi-testing/privateer-config/finos-integration/key-management/`)

| Var | Purpose | Example |
|-----|---------|---------|
| `service-type` | factory id | `key-management` |
| `tags` | filter | `@Behavioural @key-management` |
| `resource` | key filter | `finos-ccc-integration-key-main` |
| `authorized-decrypt-principals` | CN02 | from terraform JSON |
| `permitted-regions` | CN06 | `[us-east-1]` |
| `test-identities` | CN05 | same shape as object-storage |
| `import-slot-key-id` | KeyMgmt.CN04 | `finos-ccc-integration-key-import` |
| `weak-import-profiles` | KeyMgmt.CN04 | `rsa-1024`, `invalid-wrapping` |

### Integration (`modules/cloud-api-test/privateer-config/<cloud>.yml`)

Extend `services.integration.vars` with key outputs; register `key-management` in factory during implementation.

Catalog locations: [CCC.KeyMgmt_v2025.07-MP.yaml](../../../website/src/data/ccc-releases/CCC.KeyMgmt_v2025.07-MP.yaml) + `CCC.Core` release YAML.

---

## CI actions-config (planned)

| File | `privateer-service` | `test-configuration` |
|------|---------------------|----------------------|
| `cfi-testing/actions-config/aws-key-management-finos.yaml` | `awsKeyManagement` | `../privateer-config/finos-integration/key-management/aws-key-management.yml` |
| (azure/gcp siblings) | … | … |

---

## Open questions

- Azure: standard Key Vault key vs Managed HSM — v1 assumes Key Vault software/RSA key with rotation policy object.
  -  yes, we haven't got an HSM.
- AWS: is `GetKeyPolicy` JSON parsing sufficient for CN02, or require IAM simulator for attached role chains?
  - JSON parsing.
- Should `AttemptDecrypt` be a dedicated method or only identity-scoped `TriggerDataRead`?
  - Let's have a dedicated method.
- Add `@key-management` to generic Core features during implementation (same pattern as `@secrets`).
   - yes.
- Per-cloud minimum weak-import profile set for CN04 — is RSA-1024 rejected on all three providers with the same fixture shape?
   - sounds good.

---

## Review checklist

- [x] Every native AR in `controls.yaml` appears (CN01.AR01, CN02.AR01, CN03.AR01, CN04.AR01)
- [x] Feature reuse from generic table complete for seven imports
- [x] CN01 and CN03 native ARs marked Not testable; CN04 negative import path behavioural
- [x] Interface minimal (3–4 methods); logging on `logging.Service` only
- [x] AWS / Azure / GCP notes per method
- [x] Terraform fixture naming `finos-ccc-integration-key-main`
- [x] Integration + Privateer tables drafted
- [x] Only `analysis.md` created in this phase
