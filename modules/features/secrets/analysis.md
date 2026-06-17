# Behavioural test analysis: Secret Management

- **Catalog**: `catalogs/crypto/secrets/controls.yaml`
- **Catalog id**: `CCC.SecMgmt`
- **Features root**: `modules/features/secrets/`
- **Cloud-api package**: `modules/cloud-api/secrets/` (new)
- **Factory service id**: `secrets`
- **Date**: 2026-06-04

## Summary

The Secret Management catalog defines **two native controls** with **two behavioural ARs** (CN01 stale version denied, CN02 unauthorized region denied). There are **no imported CCC.Core controls** in `controls.yaml` today, so there is **no generic Core reuse** in v1 — only new features under `secrets/CCC.SecMgmt/`.

Both ARs are identity- and region-scoped **read attempts** with an expected **deny** outcome on the good fixture. Planned service-specific interface: **2 methods** plus a thin `generic.Service` embed (`GetOrProvisionTestableResources`, `CheckUserProvisioned`, `TearDown` no-op). **`logging.Service` is not required** for native ARs.

## Feature reuse from generic

| Core control | Generic (or shared) feature | Action for this service |
|--------------|----------------------------|-------------------------|
| — | — | **None** — `imported-controls.entries` is empty in [controls.yaml](../../../catalogs/crypto/secrets/controls.yaml) |

**New-only ARs (all native):**

| AR | Planned feature path |
|----|----------------------|
| CCC.SecMgmt.CN01.AR01 | `secrets/CCC.SecMgmt/CCC-SecMgmt-CN01-AR01.feature` |
| CCC.SecMgmt.CN02.AR01 | `secrets/CCC.SecMgmt/CCC-SecMgmt-CN02-AR01.feature` |

If Core imports are added later (CN04 logging, CN05 access, CN06 region), revisit this table before copying any Core features into `secrets/CCC.Core/`.

## Imported controls

| Reference | Action |
|-----------|--------|
| — | No imports in source catalog |

---

## Assessment requirements

### CCC.SecMgmt.CN01.AR01 — Deny outdated secret version after rotation

- **Requirement**: > Attempt to use an outdated version of a secret after its rotation period has passed and verify that access is denied.
- **Disposition**: Behavioural
- **Applicability**: tlp-red, tlp-amber
- **Interpretation**: After rotation, applications must not retrieve usable secret material from superseded versions. “Denied” means the cloud API returns an access error, invalid version, or empty/disabled stage — not merely that the value differs from current.
- **Approach**:
  1. Good fixture: secret with rotation enabled (or two explicit versions); terraform outputs `stale-version-id` (or `stale-version-stage`) for the superseded version and `current-version-stage` (`AWSCURRENT` / Azure latest / GCP `latest`).
  2. Sanity (`@OPT_IN`): `RetrieveSecretVersion("{uid}", current)` with `test-user-read` or admin → success.
  3. Main (`@MAIN`): `RetrieveSecretVersion("{uid}", stale)` → expect error / `AccessDenied` true.
- **Feature sketch**:
  - Background: cloud api + `secrets` service; `Given` config with `resource` = secret name.
  - Scenario A (@SANITY @OPT_IN): current version readable.
  - Scenario B (@MAIN): stale version retrieve → denied.
- **Config / fixtures**: `resource`, `stale-version-id` or `stale-version-stage`, `current-version-stage`; rotation schedule not evaluated in-test (fixture pre-rotated).
- **Gaps / honesty notes**:
  - **AWS**: `GetSecretValue` on `AWSPREVIOUS` may still return data immediately after rotation unless a secret resource policy blocks old `VersionId`s — good fixture should attach a **deny-old-version policy** or use a deleted version id from terraform output.
  - **Azure Key Vault**: disabled/old versions may return `SecretNotFound` — align stale id with terraform.
  - **GCP**: `AccessSecretVersion` with disabled version returns `FAILED_PRECONDITION` / permission denied — preferred model for honest deny.

### CCC.SecMgmt.CN02.AR01 — Deny retrieve from unauthorized region

- **Requirement**: > Attempt to retrieve a secret from an unauthorized region and verify that access is denied.
- **Disposition**: Behavioural
- **Applicability**: tlp-red, tlp-amber
- **Interpretation**: Secret material is bound to an authorized region/location (Secrets Manager region, Key Vault location, Secret Manager regional parent). A read against a **non-permitted** region endpoint must fail even if the principal has read IAM on the home region.
- **Approach**:
  1. Good fixture: secret in `authorized-region` (from `permitted-regions[0]`).
  2. `RetrieveSecretInRegion("{uid}", unauthorized-region)` using same credentials → denied (not found, forbidden, or wrong endpoint).
  3. Sanity: `RetrieveSecretInRegion("{uid}", authorized-region)` → success.
- **Feature sketch**:
  - Scenario A (@SANITY @OPT_IN): read in authorized region succeeds.
  - Scenario B (@MAIN): read via `unauthorized-region` client target → denied.
- **Config / fixtures**: `permitted-regions`, `unauthorized-region` (must differ from authorized), `resource`; no discovery of regions at runtime.
- **Gaps / honesty notes**:
  - **AWS**: wrong regional endpoint often yields `ResourceNotFoundException` (secret not in that region) — acceptable as “denied” for behavioural proof.
  - **Azure**: vault URI is regional; wrong geography = vault not found or auth failure.
  - **GCP**: regional secret parent `projects/.../locations/{loc}/secrets/...` — wrong `locations/{loc}` fails lookup.

---

## Cloud-api interface (minimal)

### `secrets.Service`

Embeds `generic.Service` for discovery and lifecycle; adds:

| Method | Used by AR(s) | Args | Returns (key fields) |
|--------|---------------|------|----------------------|
| `RetrieveSecretVersion` | CN01.AR01 | `secretID`, `versionSpecifier` (stage name, version id, or `latest`) | `SecretValue{Plaintext, VersionID, Denied, Reason}` or error |
| `RetrieveSecretInRegion` | CN02.AR01 | `secretID`, `region` (cloud region / location id) | same shape; `Denied=true` when region not authorized |

Helper types (sketch):

```go
type SecretValue struct {
    Plaintext string
    VersionID string
    Denied    bool   // true when AR expects deny
    Reason    string // API error classification for attachments
}
```

**Not on this interface:** log queries (no CN04 in catalog), rotation trigger, secret creation, or `ProvisionUserWithAccess`.

### `logging.Service`

| logType | AR(s) | resourceID meaning |
|---------|-------|-------------------|
| — | — | Not used for native SecMgmt ARs in v1 |

### `generic.Service` methods used

| Method | AR(s) | Notes |
|--------|-------|-------|
| `GetOrProvisionTestableResources` | Background | List secret matching `resource` / `CFIControlSet=CCC.SecMgmt` |
| `CheckUserProvisioned` | identity sanity | When using `GetServiceAPIWithIdentity` |
| `TearDown` | — | no-op (fixtures are terraform-managed) |
| `GetResourceRegion` | — | Reserved if CN06 imported later |
| `UpdateResourcePolicy` / `TriggerData*` | — | Not used until Core imports added |

**Method count: 2** service-specific + generic embed (minimal).

---

## Cross-cloud implementation

### `RetrieveSecretVersion`

#### AWS
- **API**: `secretsmanager:GetSecretValue` with `VersionId` or `VersionStage`.
- **Good fixture**: resource policy or rotation config so stale `VersionId` from terraform output is not readable; current stage `AWSCURRENT` succeeds.
- **Config**: `resource` (secret name/ARN suffix), `stale-version-id`, `current-version-stage`.

#### Azure
- **API**: Key Vault `Get Secret` — `https://{vault}.vault.azure.net/secrets/{name}/{version}`.
- **Notes**: Use explicit version string for stale; `latest` for sanity.
- **Config**: `azure-key-vault-name`, `azure-secret-name`, `stale-version-id`, `azure-resource-group`.

#### GCP
- **API**: `secretmanager.AccessSecretVersion` — `.../secrets/{id}/versions/{version}`.
- **Notes**: Disabled versions should fail; `latest` for sanity.
- **Config**: `gcp-project-id`, `secret-id`, `stale-version-id`, authorized `region` as location.

### `RetrieveSecretInRegion`

#### AWS
- **API**: Regional Secrets Manager client for `unauthorized-region`; `GetSecretValue` on same secret **name** (secret is regional).
- **Config**: `permitted-regions`, `unauthorized-region`, `resource`.

#### Azure
- **API**: Construct vault URI for wrong region/location (or secondary replica geography if applicable) — expect failure.
- **Config**: `azure-key-vault-uri` (authorized), `unauthorized-region` mapped to alternate vault URI template from terraform.

#### GCP
- **API**: `AccessSecretVersion` with parent `locations/{unauthorized-region}/secrets/{id}`.
- **Config**: `gcp-project-id`, `secret-id`, `permitted-regions`, `unauthorized-region`.

### `GetOrProvisionTestableResources`

#### AWS / Azure / GCP
- List/describe single pre-provisioned secret by `resource` var and optional `CFIControlSet=CCC.SecMgmt` tag — no create in test run.

---

## Terraform fixtures (planned)

| Fixture name | Role | AR(s) | Cloud(s) |
|--------------|------|-------|----------|
| `finos-ccc-integration-secret-main` | rotated secret with known version ids | CN01, CN02 | aws, azure, gcp |

Submodule path: `modules/cloud-api-test/terraform/<cloud>/modules/secrets/` (new).

**Per-cloud minimum:**

| Output | Purpose |
|--------|---------|
| `secret_name` / `secret_id` | `resource` var |
| `authorized_region` | CN02 sanity |
| `stale_version_id` | CN01 deny probe |
| `unauthorized_region` | CN02 deny probe (distinct from authorized) |
| `key_vault_uri` (Azure) | authorized endpoint |

**CN01 honesty**: Terraform should complete at least one rotation (or create two versions and disable/delete v1) before tests run; document apply-time wait in module README.

**CN02 honesty**: Single secret in one region only; no multi-region replica on good fixture.

---

## Integration test coverage (planned)

| api | method | cloud | expect_error | arg1 | arg2 | Notes |
|-----|--------|-------|--------------|------|------|-------|
| `secrets` | `RetrieveSecretVersion` | all | | `finos-ccc-integration-secret-main` | `AWSCURRENT` or `latest` | sanity |
| `secrets` | `RetrieveSecretVersion` | all | true | `finos-ccc-integration-secret-main` | `${STALE_VERSION_ID}` | CN01 |
| `secrets` | `RetrieveSecretInRegion` | all | | `finos-ccc-integration-secret-main` | authorized region | sanity |
| `secrets` | `RetrieveSecretInRegion` | all | true | `finos-ccc-integration-secret-main` | unauthorized region | CN02 |

Vars for [modules/cloud-api-test/privateer-config](../../../modules/cloud-api-test/privateer-config/) `aws.yml` / `azure.yml` / `gcp.yml`: add `resource`, `stale-version-id`, `unauthorized-region`, `permitted-regions`, cloud-specific vault/secret ids from terraform outputs.

---

## Privateer config (planned vars)

### Behavioural (`cfi-testing/privateer-config/finos-integration/secrets/`)

| Var | Purpose | Example |
|-----|---------|---------|
| `service` / `service-type` | factory id | `secrets` |
| `tags` | scenario filter | `@Behavioural @secrets` |
| `resource` | secret filter | `finos-ccc-integration-secret-main` |
| `provider` / `region` | home region | `aws`, `us-east-1` |
| `permitted-regions` | CN02 authorized | `[us-east-1]` |
| `unauthorized-region` | CN02 deny probe | `eu-west-1` |
| `stale-version-id` | CN01 deny probe | from terraform output |
| `current-version-stage` | CN01 sanity | `AWSCURRENT` / `latest` |
| `test-identities` | optional CN01 sanity | `test-user-read`, `test-user-no-access` (no-access should fail even on current) |
| `azure-key-vault-name` | Azure | `finoscccintegrationkv` |
| `azure-secret-name` | Azure | `cfi-integration-secret` |
| `gcp-secret-id` | GCP | `finos-ccc-integration-secret-main` |

Catalog locations: `CCC.Core` release YAML + `CCC.SecMgmt_DEV.yaml` (until MP publish).

### Integration (`modules/cloud-api-test/privateer-config/<cloud>.yml`)

Extend `services.integration.vars` with secret outputs above; no separate service block until factory registers `secrets`.

---

## CI actions-config (planned)

| File | `privateer-service` | `test-configuration` |
|------|---------------------|----------------------|
| `cfi-testing/actions-config/aws-secrets-finos.yaml` | `awsSecrets` | `../privateer-config/finos-integration/secrets/aws-secrets.yml` |
| `cfi-testing/actions-config/azure-secrets-finos.yaml` | `azureSecrets` | `../privateer-config/finos-integration/secrets/azure-secrets.yml` |
| `cfi-testing/actions-config/gcp-secrets-finos.yaml` | `gcpSecrets` | `../privateer-config/finos-integration/secrets/gcp-secrets.yml` |

`path` in each action config: `modules/cloud-api-test/terraform/<cloud>` (after secrets submodule exists).

---

## Open questions

- Should CN01 use **version stage** vs **version id** in features for cross-cloud consistency (`latest` + explicit stale id only)?
  - use version id consistently. 
- Azure: single Key Vault vs Managed HSM — v1 assumes standard Key Vault secrets (not HSM keys).
- AWS: is `ResourceNotFoundException` on wrong region sufficient evidence for CN02, or require explicit `AccessDeniedException`?
  - yes that's fine.  Any exception will do.
- When will CCC.Core imports be added to SecMgmt (would enable generic CN04/CN05 without duplicating features)?
   - tag the CCC.Core tests with @secrets in `generic/CCC.Core` where you need them to run for this service too.
- Add `secrets` to [modules/features/README.md](../README.md) routing (`@secrets` → `secrets/`) and [types/test.go](../../cloud-api/types/test.go) `ServiceTypes` during implementation.
   - Yes.

---

## Review checklist

- [x] Every native AR in `controls.yaml` appears in `analysis.md` (CN01.AR01, CN02.AR01)
- [x] **Feature reuse from generic** documented (none — empty imports)
- [x] No planned duplication under `generic/`
- [x] Each behavioural AR has trigger + observation + fixtures
- [x] Interface minimal (2 methods); no log-query on secrets interface
- [x] AWS / Azure / GCP filled per method
- [x] No inherited Core ARs to misclassify as Behavioural
- [x] Terraform fixtures use `finos-ccc-integration-secret-main`; one main secret per cloud
- [x] Integration test coverage table lists both methods + expect_error rows
- [x] Privateer split documented (finos-integration vs cloud-api-test)
- [x] actions-config entries planned
- [x] Implementation complete per [build-features-and-cloud-api skill](../../../skills/build-features-and-cloud-api/SKILL.md) (features, cloud-api, terraform, integration CSV, Privateer, actions-config)
