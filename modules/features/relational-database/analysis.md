# Behavioural test analysis: Relational Database Management System

- **Catalog**: `catalogs/database/relational/controls.yaml`
- **Catalog id**: `CCC.RDMS`
- **Features root**: `modules/features/relational-database/`
- **Shared features root**: `modules/features/generic/`
- **Cloud-api package**: `modules/cloud-api/relational-database/` (new; `relational-database` already in [types/test.go](../../../modules/cloud-api/types/test.go) `ServiceTypes`)
- **Factory service id**: `relational-database`
- **Date**: 2026-06-08
- **MP release**: [CCC.RDMS_v2025.05-MP.yaml](../../../website/src/data/ccc-releases/CCC.RDMS_v2025.05-MP.yaml)

## Summary

The RDMS catalog defines **five native controls** with **five ARs** plus **eleven imported CCC.Core controls** — the largest Core import set in Wave 1. Native ARs are predominantly **access-denial and auth-hardening probes** (default credentials, lockout, backup/restore RBAC, snapshot sharing). **CN03.AR01** (backup-failure alert) is **not testable** in CI (alert delivery).

Most inherited Core ARs reuse **generic/** scenarios with `@relational-database`. New service-specific methods are needed for **SQL/auth probes**, **encryption describe**, and **snapshot share attempts**. **CN12** (secure network access) may share patterns with VM `AttemptInboundConnection` or `@PerPort` if the DB exposes a probed port.

Planned interface: **5–6 service-specific methods** + `generic.Service` + `logging.Service`.

## Feature reuse from generic

| Core control | Generic (or shared) feature | Action for this service |
|--------------|----------------------------|-------------------------|
| CCC.Core.CN03 | `generic/CCC.Core/CCC-Core-CN03-AR01.feature` | Add `@relational-database` to `@NotTestable` |
| CCC.Core.CN04.AR01–AR03 | `generic/CCC.Core/CCC-Core-CN04-AR0*.feature` | Add `@relational-database`; SQL write/read + admin policy change + `logging.QueryLogs` |
| CCC.Core.CN05.AR06 | `generic/CCC.Core/CCC-Core-CN05-AR06.feature` | Add `@relational-database`; extend for AR01/AR02 |
| CCC.Core.CN06.AR01 | `vpc/CCC.Core/CCC-Core-CN06-AR01.feature` | Add `@relational-database`; `GetResourceRegion` |
| CCC.Core.CN07.AR01/AR02 | `generic/CCC.Core/CCC-Core-CN07-AR0*.feature` | Add `@relational-database` to `@NotTestable` |
| CCC.Core.CN10.AR01 | `generic/CCC.Core/CCC-Core-CN10-AR01.feature` | Add `@relational-database` to `@NotTestable` |
| CCC.Core.CN01.* | `generic/CCC.Core/CCC-Core-CN01-AR*.feature` | Add `@relational-database` on `@PerPort` if DB listener probed (TLS to SQL port) |
| CCC.Core.CN08 | — | `@NotTestable` stub — multi-AZ/replica is describe-only unless `GetReplicationStatus` added |
| CCC.Core.CN09 | — | `@NotTestable` — log sink tamper-proofing is platform-wide |
| CCC.Core.CN12 | `port/` or `relational-database/CCC.Core/` | **New or extend** — inbound connection to DB port from unauthorized CIDR |

**New-only (native + Core CN02):**

| AR | Planned feature path |
|----|----------------------|
| CCC.RDMS.CN01.AR02 | `relational-database/CCC.RDMS/CCC-RDMS-CN01-AR02.feature` |
| CCC.RDMS.CN02.AR01 | `relational-database/CCC.RDMS/CCC-RDMS-CN02-AR01.feature` |
| CCC.RDMS.CN04.AR01 | `relational-database/CCC.RDMS/CCC-RDMS-CN04-AR01.feature` |
| CCC.RDMS.CN05.AR01 | `relational-database/CCC.RDMS/CCC-RDMS-CN05-AR01.feature` |
| CCC.Core.CN02.AR01 | `relational-database/CCC.Core/CCC-Core-CN02-AR01.feature` |

## Imported controls

| Reference | Action |
|-----------|--------|
| CCC.Core.CN01 | `@PerPort` TLS probe to SQL listener where cloud exposes TCP + TLS (Postgres/MySQL); else `@NotTestable` with comment |
| CCC.Core.CN02 | **New** `GetStorageEncryptionStatus` on instance/database |
| CCC.Core.CN03–CN07, CN09–CN10 | Reuse or stub per table above |
| CCC.Core.CN04 | Reuse generic logging trio |
| CCC.Core.CN05 | Extend generic identity deny |
| CCC.Core.CN06 | Reuse `vpc/CCC-Core-CN06-AR01` |
| CCC.Core.CN12 | **New** network access probe (port harness or `AttemptInboundConnection` variant) |

---

## Assessment requirements (native)

### CCC.RDMS.CN01.AR02 — Deny default credentials

- **Requirement**: > When an attempt is made to authenticate to the database using known default credentials, the authentication attempt must fail and no access should be granted.
- **Disposition**: Behavioural
- **Applicability**: tlp-red, tlp-amber
- **Approach**:
  1. Terraform provisions DB with **non-default** admin password; outputs do not publish defaults.
  2. `AttemptAuthentication("{uid}", defaultUsername, defaultPassword)` with vendor-known defaults (`postgres`/`postgres`, `sa`/``, etc.) → expect authentication error.
  3. Sanity: `AttemptAuthentication` with `test-user-read` credentials → success (optional `@OPT_IN`).
- **Config / fixtures**: `default-username`, `default-password-list` (catalog of banned defaults); `db-endpoint`, `db-port`.
- **Gaps**: Proves defaults are not active — does not scan for *all* weak passwords.

### CCC.RDMS.CN02.AR01 — Lockout / rate-limit after failed logins

- **Requirement**: > When repeated failed login attempts are made in a short timeframe, the account must be locked out or rate-limited to prevent further login attempts.
- **Disposition**: Behavioural
- **Approach**:
  1. `AttemptFailedLoginBurst("{uid}", count)` with wrong password for a dedicated test user.
  2. Subsequent valid-password attempt → denied or rate-limited error within burst window.
  3. Fixture enables connection throttling / failed-login policy (Azure SQL, RDS parameter group, Cloud SQL flags).
- **Gaps**: Lockout duration and exact threshold are provider-specific — terraform documents expected `lockout-threshold`.

### CCC.RDMS.CN03.AR01 — Alert when backups fail or are disabled

- **Requirement**: > When backups are disabled, paused, or fail to run as scheduled, an alert must be triggered and logged.
- **Disposition**: Not testable
- **Interpretation**: Alert *delivery* and scheduled backup failure simulation are out of scope; optional describe of `BackupEnabled=true` is policy-only, not behavioural proof of alerting.
- **Approach**: `@NotTestable` stub; optional `GetBackupConfiguration` describe for config-scan narrative only.

### CCC.RDMS.CN04.AR01 — Deny unauthorized backup/restore

- **Requirement**: > When there is an attempt to perform a backup or restore, then the attempt must fail with an access denied message if credentials or roles that are not explicitly authorized for backup/restore functions.
- **Disposition**: Behavioural
- **Approach**:
  1. `test-user-no-access` via `GetServiceAPIWithIdentity`.
  2. `AttemptBackupRestore("{uid}", "backup")` and `"...", "restore"` → expect access denied.
  3. Admin identity sanity optional.
- **Config**: `test-identities`; fixture grants backup role only to admin principal.

### CCC.RDMS.CN05.AR01 — Deny snapshot share to unauthorized account

- **Requirement**: > When an attempt is made to share a snapshot with an unauthorized account, the sharing request must be denied.
- **Disposition**: Behavioural
- **Approach**:
  1. Pre-created snapshot on good fixture.
  2. `AttemptShareSnapshot("{uid}", unauthorizedAccountId)` → denied.
  3. `unauthorized-account-id` from terraform (distinct from owner account).
- **Gaps**: Azure/GCP snapshot sharing models differ from AWS RDS snapshot sharing — document per-cloud API mapping.

---

## Assessment requirements (inherited Core — highlights)

### CCC.Core.CN02.AR01 — Encryption at rest

- **Disposition**: Behavioural — `GetStorageEncryptionStatus`
- **Returns**: `Encrypted bool`, `KMSKeyId string`, `EncryptionAlgorithm string` for instance + storage layer.

### CCC.Core.CN04 — Logging

- **Disposition**: Behavioural — reuse generic
- **Notes**: `TriggerDataWrite` = INSERT/UPDATE probe row; `TriggerDataRead` = SELECT; `UpdateResourcePolicy` = harmless parameter/tag change; audit logs via `logging.QueryLogs`.

### CCC.Core.CN05 — Unauthorized SQL access

- **Disposition**: Behavioural — identity-scoped `TriggerDataRead` / `TriggerDataWrite` / `UpdateResourcePolicy`.

### CCC.Core.CN06 — Region

- **Disposition**: Behavioural — `GetResourceRegion` via `vpc/CCC-Core-CN06-AR01`.

### CCC.Core.CN08 — Multi-zone replication

- **Disposition**: Not testable v1 or describe-only via optional `GetReplicationStatus` if added to generic embed.

### CCC.Core.CN12 — Secure network access

- **Disposition**: Behavioural — probe connection from unauthorized source IP/CIDR to DB port; may reuse VM-style `AttemptInboundConnection` adapted for DB endpoint.

---

## Cloud-api interface (minimal)

### `relational-database.Service`

| Method | Used by AR(s) | Args | Returns |
|--------|---------------|------|---------|
| `AttemptAuthentication` | RDMS.CN01.AR02 | `instanceID`, `username`, `password` | error or success |
| `AttemptFailedLoginBurst` | RDMS.CN02.AR01 | `instanceID`, `username`, `attemptCount int` | `LockedOut bool`, error |
| `AttemptBackupRestore` | RDMS.CN04.AR01 | `instanceID`, `operation string` | error |
| `AttemptShareSnapshot` | RDMS.CN05.AR01 | `instanceID`, `targetAccount string` | error |
| `GetStorageEncryptionStatus` | Core.CN02.AR01 | `instanceID string` | `Encrypted`, `KMSKeyId`, `Algorithm` |
| `AttemptInboundConnection` (optional) | Core.CN12 | `instanceID`, `port int` | connection result — collapse with port harness if shared |

### `logging.Service`

| logType | AR(s) |
|---------|-------|
| `admin` | CN04.AR01 |
| `data-write` | CN04.AR02 |
| `data-read` | CN04.AR03 |

### `generic.Service` methods used

`GetOrProvisionTestableResources`, `CheckUserProvisioned`, `UpdateResourcePolicy`, `TriggerDataWrite`, `TriggerDataRead`, `GetResourceRegion`, `TearDown`.

---

## Cross-cloud implementation (sketch)

| Method | AWS | Azure | GCP |
|--------|-----|-------|-----|
| `AttemptAuthentication` | RDS Postgres/MySQL driver | Azure SQL token/SQL auth | Cloud SQL connector |
| `AttemptFailedLoginBurst` | Repeated bad password to RDS | Azure SQL lockout policy | Cloud SQL `max_connections` / deny |
| `AttemptBackupRestore` | `rds:CreateDBSnapshot` denied | SQL backup APIs / ARM deny | `sql.backupRuns` / export deny |
| `AttemptShareSnapshot` | `ModifyDBSnapshotAttribute` | Azure snapshot share differs — may mark partial | — or alternate AR honesty |
| `GetStorageEncryptionStatus` | `DescribeDBInstances` `StorageEncrypted` | `transparentDataEncryption` | `settings.backupConfiguration` + disk encryption |

Mark Azure/GCP snapshot-share cells with prerequisites if API has no direct equivalent.

---

## Terraform fixtures (planned)

| Fixture | Role | AR(s) |
|---------|------|-------|
| `finos-ccc-integration-db-main` | encrypted, non-default creds, backups on, private networking | native + Core |
| `finos-ccc-integration-db-snapshot` | snapshot for share-deny test | CN05 |
| `unauthorized-account-id` / `unauthorized-cidr` | negative probes | CN05, CN12 |

Submodule: `modules/cloud-api-test/terraform/<cloud>/modules/relational-database/`.

---

## Integration test coverage (planned)

| api | method | cloud | expect_error | arg1 | arg2 | Notes |
|-----|--------|-------|--------------|------|------|-------|
| `relational-database` | `GetStorageEncryptionStatus` | all | | main instance | | Core CN02 |
| `relational-database` | `AttemptAuthentication` | all | true | main | default creds | CN01 |
| `relational-database` | `AttemptFailedLoginBurst` | all | | main | `5` | CN02 — follow-up row expects lockout |
| `relational-database` | `AttemptBackupRestore` | all | true | main | `backup` | CN04 + no-access identity |
| `relational-database` | `AttemptShareSnapshot` | all | true | main | unauthorized account | CN05 |

---

## Open questions

- Engine choice for v1: Postgres across clouds vs provider-default (affects auth/lockout semantics)?
- Azure snapshot sharing: is CN05.AR01 `@NotTestable` on Azure until equivalent API exists?
- CN12: test from runner public IP against publicly reachable bad fixture vs simulate with security group rule describe only?
- Cloud SQL Auth proxy vs direct TCP for integration tests in GHA?

---

## Review checklist

- [x] All five native ARs documented (CN01.AR02, CN02.AR01, CN03.AR01, CN04.AR01, CN05.AR01)
- [x] Eleven Core imports classified
- [x] CN03 native marked Not testable
- [x] Interface table + cross-cloud sketch
- [x] Fixtures and integration CSV planned
- [x] Only `analysis.md` in this phase
