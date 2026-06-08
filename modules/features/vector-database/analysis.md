# Behavioural test analysis: Vector Database

- **Catalog**: `catalogs/database/vector/controls.yaml`
- **Catalog id**: `CCC.Vector`
- **Features root**: `modules/features/vector-database/`
- **Shared features root**: `modules/features/generic/` + `modules/features/port/` (`@PerPort`, CN12)
- **Cloud-api package**: `modules/cloud-api/vector-database/` (new; add `vector-database` to [types/test.go](../../../modules/cloud-api/types/test.go) `ServiceTypes`)
- **Factory service id**: `vector-database`
- **Date**: 2026-06-08

## Summary

The Vector Database catalog defines **seven native controls** with **seven ARs** plus **ten imported CCC.Core controls**. **Important:** this catalog uses **variant Core wording** for CN06 (“Require Access Approval”) and CN07 (“Limit Public Access to Resources”) — **not** the usual region / enumeration-alert meanings. It also imports **CN12** (secure network access rules) and omits Core CN08 and CN11.

**Six native ARs are behavioural in v1** (CN01/CN06 embedding validation, CN02 lifecycle RBAC, CN03 metadata-filter auth, CN04 ingestion throttle, CN05 rollback auth + log). **CN07** is **behavioural (partial)** — `exact` vs ANN flag honored where the provider exposes it. **CN01 and CN06 overlap** on dimension/format negative probes — single test path with dual AR coverage documented.

Inherited Core: **CN04**, **CN05**, **CN01** (`@PerPort`), **CN02** (encryption describe), **CN07** (public access), **CN12** (network probe) need service-specific work; **CN03**, **CN06** (access approval), **CN09**, **CN10** are **`@NotTestable`** stubs.

v1 assumes a managed vector index per cloud: **OpenSearch Serverless vector collection** (AWS), **Azure AI Search** index with vector profile, **Vertex AI Vector Search** index (GCP). Dimension profile **1536** (example) from terraform.

Planned interface: **6–7 methods** plus `generic.Service` embed and `logging.Service` for Core CN04 and CN05 admin log.

## Feature reuse from generic

| Core control | Generic (or shared) feature | Action for this service |
|--------------|----------------------------|-------------------------|
| CCC.Core.CN03 | `generic/CCC.Core/CCC-Core-CN03-AR01.feature` | Add `@vector-database` to `@NotTestable` |
| CCC.Core.CN04.AR01 | `generic/CCC.Core/CCC-Core-CN04-AR01.feature` | Add `@vector-database`; `UpdateResourcePolicy` on index + `logging.QueryLogs` (`admin`) |
| CCC.Core.CN04.AR02 | `generic/CCC.Core/CCC-Core-CN04-AR02.feature` | Add `@vector-database`; `UpsertEmbedding` + `logging.QueryLogs` (`data-write`) |
| CCC.Core.CN04.AR03 | `generic/CCC.Core/CCC-Core-CN04-AR03.feature` | Add `@vector-database`; `SearchVectors` + `logging.QueryLogs` (`data-read`) |
| CCC.Core.CN05.AR06 | `generic/CCC.Core/CCC-Core-CN05-AR06.feature` | Add `@vector-database`; identity-scoped upsert/search/lifecycle deny |
| CCC.Core.CN06 | — | **Variant control** (“Require Access Approval”) — `@NotTestable` stub in `vector-database/CCC.Core/`; not `vpc/CCC-Core-CN06-AR01` (region) |
| CCC.Core.CN07 | — | **Variant control** (“Limit Public Access”) — **new** `GetPublicAccessStatus` + optional anonymous query deny |
| CCC.Core.CN09 | — | `@NotTestable` — platform log tamper |
| CCC.Core.CN10 | `generic/CCC.Core/CCC-Core-CN10-AR01.feature` | Add `@vector-database` to `@NotTestable` |
| CCC.Core.CN01.* | `generic/CCC.Core/CCC-Core-CN01-AR*.feature` | Add `@vector-database` `@PerPort` — HTTPS to search/ingest API endpoint |
| CCC.Core.CN02.AR01 | `vector-database/CCC.Core/CCC-Core-CN02-AR01.feature` | **New** — `GetEncryptionConfiguration` on index backing store |
| CCC.Core.CN12 | `port/` or `vector-database/CCC.Core/CCC-Core-CN12-AR01.feature` | **New** — inbound connection to index API from unauthorized network |

**New-only scenarios (native):**

| AR | Planned feature path |
|----|----------------------|
| CCC.Vector.CN01.AR01 | `vector-database/CCC.Vector/CCC-Vector-CN01-AR01.feature` |
| CCC.Vector.CN02.AR01 | `vector-database/CCC.Vector/CCC-Vector-CN02-AR01.feature` |
| CCC.Vector.CN03.AR01 | `vector-database/CCC.Vector/CCC-Vector-CN03-AR01.feature` |
| CCC.Vector.CN04.AR01 | `vector-database/CCC.Vector/CCC-Vector-CN04-AR01.feature` |
| CCC.Vector.CN05.AR01 | `vector-database/CCC.Vector/CCC-Vector-CN05-AR01.feature` |
| CCC.Vector.CN06.AR01 | `vector-database/CCC.Vector/CCC-Vector-CN06-AR01.feature` (may merge steps with CN01) |
| CCC.Vector.CN07.AR01 | `vector-database/CCC.Vector/CCC-Vector-CN07-AR01.feature` |

## Imported controls

| Reference | Action |
|-----------|--------|
| CCC.Core.CN01 | `@PerPort` TLS to vector HTTPS API (search/ingest URL) |
| CCC.Core.CN02 | **New** `GetEncryptionConfiguration` — SSE/KMS on index storage |
| CCC.Core.CN03 | Reuse `generic/CCC-Core-CN03-AR01.feature` — `@NotTestable` |
| CCC.Core.CN04 | Reuse `generic/CCC-Core-CN04-AR0*.feature` — upsert/search triggers |
| CCC.Core.CN05 | Extend generic CN05 — `test-user-no-access` on upsert/delete/search |
| CCC.Core.CN06 | **Variant** — `@NotTestable` access-approval workflow (not region) |
| CCC.Core.CN07 | **Variant** — `GetPublicAccessStatus`; deny public/anonymous index API access |
| CCC.Core.CN09 | `@NotTestable` |
| CCC.Core.CN10 | Reuse `generic/CCC-Core-CN10-AR01.feature` — `@NotTestable` |
| CCC.Core.CN12 | **New** network access probe to index endpoint |

---

## Assessment requirements (native)

### CCC.Vector.CN01.AR01 — Validate embedding schema, dimension, format

- **Requirement**: > When a vector embedding is submitted for indexing, the system MUST validate that it matches expected schema, dimension, and format profiles.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear, tlp-green, tlp-amber, tlp-red
- **Interpretation**: Upsert path rejects vectors that are wrong length, wrong element type, non-numeric, or missing required metadata schema **before** persisting to the index.
- **Approach**:
  1. Terraform: index with `expected-dimension` (e.g. 1536), `allowed-metadata-schema` (required keys), `vector-element-type=float32`.
  2. `UpsertEmbedding("{index-id}", vector, metadata, profile="valid")` as admin → success (sanity).
  3. Negative profiles via `bad-embedding-profiles` config:
     - `wrong-dimension` — length 512 vs 1536 → error
     - `wrong-format` — string elements / NaN / inf → error
     - `invalid-schema` — missing required metadata key → error
  4. Assert API error / `ValidationFailed=true`; index document count unchanged (optional describe).
- **Feature sketch**:
  - When embedding with wrong dimension is upserted
  - Then operation fails with validation error
- **Config / fixtures**: `expected-dimension`, `bad-embedding-profiles`, `valid-test-vector-id`; harness generates vectors programmatically (no checked-in embedding blobs).
- **Gaps / honesty notes**:
  - Proves **structural** validation — not statistical poisoning detection (outlier norms) unless provider exposes it.
  - **CN06.AR01** shares wrong-dimension/format probes; CN01 additionally covers **metadata schema**.

### CCC.Vector.CN02.AR01 — RBAC on index lifecycle

- **Requirement**: > When an index lifecycle event is triggered, the service MUST verify that the actor has explicit permissions for the operation type.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear, tlp-green, tlp-amber, tlp-red
- **Interpretation**: Create, delete, and rollback (CN05) require privileged identities — `test-user-no-access` denied.
- **Approach**:
  1. `AttemptIndexLifecycle("{index-id}", operation, identity=admin)` → `create`/`delete`/`rollback` per allowed ops on fixture.
  2. Same call as `test-user-no-access` → `AccessDenied` / 403.
  3. Operations use dedicated **disposable** sub-index names where delete is destructive (`finos-ccc-integration-vector-index-lifecycle-probe`).
- **Feature sketch**:
  - When unauthorized identity attempts index delete
  - Then operation is denied
- **Config / fixtures**: `lifecycle-probe-index`, `test-user-no-access`, `trusted-admin-principal`.
- **Gaps / honesty notes**: Uses **separate probe index** for delete tests — not the main shared index. Create may be subscription-quota heavy — prefer delete/rollback deny on existing probe index.

### CCC.Vector.CN03.AR01 — Metadata filter authorization

- **Requirement**: > When a metadata filter is applied to a query, the service MUST verify the requester is authorized to access that field.
- **Disposition**: Behavioural (partial)
- **Applicability**: tlp-amber, tlp-red
- **Interpretation**: Query filtering on a **restricted metadata field** (e.g. `tenant_id`, `pii_class`) must fail for identities without field-level permission.
- **Approach**:
  1. Terraform: documents with `public_label` (all readers) and `restricted_label` (admin only); RBAC / field security policy where cloud supports it.
  2. `SearchVectors("{index-id}", queryVector, metadataFilter={restricted_field: value}, identity=test-user-read)` → deny or empty with `FieldAccessDenied`.
  3. Sanity: filter on `allowed-metadata-fields` → results returned.
- **Feature sketch**:
  - When query applies filter on restricted metadata field as unauthorized user
  - Then search is denied or field is masked
- **Config / fixtures**: `restricted-metadata-field`, `allowed-metadata-fields`, `test-user-read` without restricted-field role.
- **Gaps / honesty notes**:
  - **AWS OpenSearch** fine-grained field security — supported with honesty path.
  - **Azure AI Search** — document-level security / OData filters; field-level may map to `@OPT_IN` or role-limited index.
  - **GCP** — may be index-level IAM only; mark partial `@NotTestable` if field RBAC unavailable.

### CCC.Vector.CN04.AR01 — Ingestion quotas and throttling

- **Requirement**: > When ingestion exceeds pre-defined thresholds, the service MUST throttle or reject excess vector write operations.
- **Disposition**: Behavioural
- **Applicability**: tlp-green, tlp-amber, tlp-red
- **Interpretation**: Burst upserts beyond quota → HTTP 429 / throttling / explicit reject — scaled-down threshold for CI.
- **Approach**:
  1. Terraform: low write TPS / document rate limit on index (documented `ingestion-quota-per-minute` e.g. 30 for CI).
  2. `UpsertEmbeddingBurst("{index-id}", count=quota+20)` from single client identity.
  3. Assert `ThrottledCount > 0` OR later upserts return throttle error within burst window.
- **Feature sketch**:
  - When embedding burst exceeds configured quota
  - Then excess writes are throttled or rejected
- **Config / fixtures**: `ingestion-quota-per-minute`, `burst-count` in privateer (CI-friendly, not production scale).
- **Gaps / honesty notes**: Catalog implies sustained overload — integration uses **short burst** analogue. No WAF layer — provider-native quota only.

### CCC.Vector.CN05.AR01 — Rollback authorization and audit log

- **Requirement**: > When a rollback is attempted, the system MUST log the action and verify rollback authorization.
- **Disposition**: Behavioural
- **Applicability**: tlp-amber, tlp-red
- **Interpretation**: Unauthorized rollback → deny; authorized rollback → success + admin audit record.
- **Approach**:
  1. `AttemptIndexLifecycle("{index-id}", "rollback", identity=test-user-no-access)` → deny (overlaps CN02).
  2. `AttemptIndexLifecycle("{index-id}", "rollback", identity=admin)` → success **if provider supports versioned rollback** (`@OPT_IN`).
  3. `logging.QueryLogs("{index-id}", "admin", lookback)` → contains rollback event with admin identity.
- **Feature sketch**:
  - When unauthorized rollback is attempted
  - Then operation is denied
  - When authorized rollback succeeds
  - Then admin log records the action
- **Config / fixtures**: `versioned-index-id` or snapshot-enabled index; admin log sink vars.
- **Gaps / honesty notes**:
  - Not all managed vector services expose **rollback** API — AWS snapshot restore, Azure index rebuild — may test **deny path only** in v1.
  - Log assertion proves **event recorded**, not SIEM alert delivery.

### CCC.Vector.CN06.AR01 — Dimensional and format constraints

- **Requirement**: > When an embedding is submitted, the service MUST validate that its format and dimensionality match allowed profiles.
- **Disposition**: Behavioural (shared with CN01)
- **Applicability**: tlp-clear, tlp-green, tlp-amber, tlp-red
- **Interpretation**: Subset of CN01 focused on **model specification** (dimension + numeric format) — not metadata schema.
- **Approach**: Reuse CN01 negative profiles `wrong-dimension`, `wrong-format` — same `UpsertEmbedding` calls and assertions.
- **Feature sketch**:
  - When embedding dimension does not match `expected-dimension`
  - Then upsert fails
- **Config / fixtures**: `expected-dimension`, `allowed-format=float32`.
- **Gaps / honesty notes**: Single harness path covers CN01.AR01 + CN06.AR01; feature files may `@MAIN` share scenarios with distinct AR tags.

### CCC.Vector.CN07.AR01 — Exact vs approximate search

- **Requirement**: > When a search request is issued, clients MUST be allowed to declare their requirement for exact vs approximate results.
- **Disposition**: Behavioural (partial)
- **Applicability**: tlp-amber, tlp-red
- **Interpretation**: API accepts `exact=true|false` (or provider equivalent) and response metadata reflects mode honored — not that exact kNN returned identical rankings to brute force.
- **Approach**:
  1. Seed index with small fixed vector set (terraform or test setup).
  2. `SearchVectors("{index-id}", queryVector, exact=true)` → `SearchMode=exact` (or `knn.algorithm=exact`) in response metadata.
  3. `SearchVectors(..., exact=false)` → `SearchMode=approximate` / `ann`.
  4. Optional: on `@OPT_IN`, compare top-1 id stability exact vs ANN on tiny index.
- **Feature sketch**:
  - When search is issued with exact requirement
  - Then response metadata indicates exact search mode
- **Config / fixtures**: `seed-vector-ids`, `query-vector-profile`.
- **Gaps / honesty notes**:
  - Provider support varies — Azure **exhaustive kNN**, OpenSearch **exact search** flags, GCP Matching Engine parameters — mark unsupported `—` per cloud.
  - Does not prove **fidelity** — only that client **may declare** mode and API acknowledges it.

---

## Assessment requirements (inherited Core — summary)

| Core AR | Disposition | Approach |
|---------|-------------|----------|
| CCC.Core.CN01 | `@PerPort` | TLS probe to vector HTTPS API |
| CCC.Core.CN02 | Behavioural (describe) | `GetEncryptionConfiguration` on index store |
| CCC.Core.CN03 | `@NotTestable` | Account MFA |
| CCC.Core.CN04 | Behavioural | Tag generic; upsert/search + `logging.QueryLogs` |
| CCC.Core.CN05 | Behavioural | Tag generic; identity deny on upsert/search/delete |
| CCC.Core.CN06 | `@NotTestable` | **Access approval** workflow (variant — not region) |
| CCC.Core.CN07 | Behavioural (describe + optional deny) | `GetPublicAccessStatus`; anonymous API call denied |
| CCC.Core.CN09 | `@NotTestable` | Log tamper |
| CCC.Core.CN10 | `@NotTestable` | Cross-perimeter replication |
| CCC.Core.CN12 | Behavioural | Network probe — unauthorized CIDR to index API port |

---

## Cloud-api interface (minimal)

### `vector-database.Service`

| Method | Used by AR(s) | Args | Returns (key fields) |
|--------|---------------|------|----------------------|
| `UpsertEmbedding` | CN01, CN04, CN06 | `indexID`, `vector[]float32`, `metadata map`, `profile string` | `DocumentID`, `ValidationFailed`, `Error` |
| `UpsertEmbeddingBurst` | CN04 | `indexID`, `count int` | `SuccessCount`, `ThrottledCount`, `RejectedCount` |
| `SearchVectors` | CN03, CN07 | `indexID`, `queryVector[]float32`, `metadataFilter map`, `exact bool`, `identity string` | `Results[]`, `SearchMode`, `FieldAccessDenied` |
| `AttemptIndexLifecycle` | CN02, CN05 | `indexID`, `operation string`, `identity string` | `Allowed`, `Error` |
| `GetIndexConfiguration` | Background / sanity | `indexID string` | `Dimension`, `Format`, `DocumentCount` |
| `GetEncryptionConfiguration` | Core CN02 | `indexID string` | `EncryptionEnabled`, `KMSKeyID` |
| `GetPublicAccessStatus` | Core CN07 | `indexID string` | `PublicAccessBlocked`, `EndpointPrivate` |

Embed `generic.Service` for `GetOrProvisionTestableResources`, `UpdateResourcePolicy`, `GetResourceRegion` (if needed for other catalogs only — **not** Vector Core CN06), `CheckUserProvisioned`, `TearDown`.

### `logging.Service` (second service)

| logType | AR(s) | resourceID meaning |
|---------|-------|-------------------|
| `admin` | CN05, Core CN04.AR01 | Index / collection id |
| `data-write` | Core CN04.AR02 | Upsert operations |
| `data-read` | Core CN04.AR03 | Search operations |

### `generic.Service` methods used

| Method | AR(s) |
|--------|-------|
| `GetOrProvisionTestableResources` | factory wiring |
| `CheckUserProvisioned` | index exists |
| `UpdateResourcePolicy` | Core CN04.AR01 |
| `TearDown` | cleanup |

---

## Cross-cloud implementation

| Method | AWS | Azure | GCP |
|--------|-----|-------|-----|
| `UpsertEmbedding` | OpenSearch Serverless `PUT _doc` / bulk with kNN vector field validation | AI Search `uploadDocuments` vector field | Vector Search `upsertDatapoints` |
| `UpsertEmbeddingBurst` | Bulk index loop until 429 | Indexer batch / REST throttle | Upsert RPC burst |
| `SearchVectors` | `knn` query + FGAC filter | Vector search OData + security filters | `findNeighbors` + restricts |
| `AttemptIndexLifecycle` | Collection/index create/delete; snapshot restore | Index create/delete; rebuild | Index deploy/update/delete |
| `GetIndexConfiguration` | `DescribeIndex` / cat indices | `GET index` stats | Index config API |
| `GetEncryptionConfiguration` | AOSS encryption at rest | Storage CMK on search service | CMEK on index |
| `GetPublicAccessStatus` | AOSS network/VPC policy | Public network access flags | Private service connect / IAM |

**Prerequisites:** `expected-dimension`, `vector-index-endpoint`, `ingestion-quota-per-minute`, metadata field names from privateer vars — no discovery.

**Unsupported honesty:** CN03 field-level RBAC on GCP may be `—`; CN05 rollback on services without snapshot API — deny-only; CN07 exact mode — per-cloud matrix below.

### Per-method notes

#### `UpsertEmbedding` (CN01, CN06)

- **AWS**: OpenSearch Serverless vector field `dimension` enforced on mapping; wrong length → 400.
- **Azure**: Vector profile `dimensions` on index schema; mismatch → indexing error.
- **GCP**: `feature_vector` dimension on index config; upsert dimension mismatch → INVALID_ARGUMENT.

#### `SearchVectors` (CN03, CN07)

- **AWS**: FGAC for document/field rules; `knn` with `"method": { "name": "hnsw", ... }` vs exact if supported in collection version.
- **Azure**: `vectorQueries` with `exhaustive: true` for exact kNN; document-level security for metadata filters.
- **GCP**: `findNeighbors` parameters for exact vs approximate; IAM for index — field filter partial.

#### `AttemptIndexLifecycle` (CN02, CN05)

- **AWS**: `es:DeleteIndex`, collection policies; snapshot `restore` for rollback `@OPT_IN`.
- **Azure**: Index delete via REST; no native “rollback” — map to deny + admin log on `rebuild` `@OPT_IN`.
- **GCP**: Index update/delete via Vertex API; rollback via prior index generation if exposed.

---

## Terraform fixtures (planned)

| Fixture | Role | AR(s) |
|---------|------|-------|
| `finos-ccc-integration-vector-index` | Main index, dim=1536, encryption, private endpoint | CN01, CN04, CN06, CN07 |
| `finos-ccc-integration-vector-index-lifecycle-probe` | Disposable index for delete tests | CN02 |
| `finos-ccc-integration-vector-index-versioned` | Snapshot / version enabled | CN05 `@OPT_IN` |
| `expected-dimension` | Output (e.g. 1536) | CN01, CN06 |
| `allowed-metadata-fields` / `restricted-metadata-field` | CN03 | |
| `ingestion-quota-per-minute` | Low quota for CI burst | CN04 |
| `bad-embedding-profiles` | Config list for negative tests | CN01, CN06 |
| `seed-vectors` | Small fixed set for CN07 | CN07 |

Submodule: `modules/cloud-api-test/terraform/<cloud>/modules/vector-database/`.

**Cost control:** OpenSearch Serverless has **OCU minimum cost** — document ~$50–100/mo if always on; consider **exercise-only** tier with API wiring against smallest collection or `@OPT_IN` full index. Azure AI Search basic tier + GCP smallest index — compare in open questions.

**Gen-ai overlap:** RAG knowledge base may **share** backing vector store with `gen-ai` fixture — separate factory ids, same terraform module optional.

---

## Integration test coverage (planned)

| api | method | cloud | expect_error | arg1 | arg2 | Notes |
|-----|--------|-------|--------------|------|------|-------|
| `vector-database` | `GetOrProvisionTestableResources` | all | | | | factory |
| `vector-database` | `CheckUserProvisioned` | all | | main | | index exists |
| `vector-database` | `UpsertEmbedding` | all | true | main | `wrong-dimension` | CN01, CN06 |
| `vector-database` | `UpsertEmbedding` | all | true | main | `invalid-schema` | CN01 |
| `vector-database` | `UpsertEmbedding` | all | | main | `valid` | sanity |
| `vector-database` | `UpsertEmbeddingBurst` | all | | main | `burst-count` | CN04 |
| `vector-database` | `SearchVectors` | all | true | main | `restricted-filter` | CN03 |
| `vector-database` | `SearchVectors` | all | | main | `exact-true` | CN07 |
| `vector-database` | `SearchVectors` | all | | main | `exact-false` | CN07 ANN |
| `vector-database` | `AttemptIndexLifecycle` | all | true | lifecycle-probe | `delete` | CN02 — no-access identity |
| `vector-database` | `AttemptIndexLifecycle` | all | true | versioned | `rollback` | CN05 deny |
| `vector-database` | `GetEncryptionConfiguration` | all | | main | | Core CN02 |
| `vector-database` | `GetPublicAccessStatus` | all | | main | | Core CN07 |
| `logging` | `QueryLogs` | all | | main | `admin`, `60` | CN05 `@OPT_IN` |

---

## Privateer config (planned vars)

### Behavioural (`cfi-testing/privateer-config/finos-integration/vector-database/`)

| Var | Purpose | Example |
|-----|---------|---------|
| `service` / `service-type` | factory id | `vector-database` |
| `tags` | scenario filter | `@Behavioural @vector-database` |
| `resource` | index filter | `finos-ccc-integration-vector-index` |
| `expected-dimension` | CN01, CN06 | `1536` |
| `bad-embedding-profiles` | CN01 | `wrong-dimension`, `wrong-format`, `invalid-schema` |
| `restricted-metadata-field` | CN03 | `tenant_id` |
| `allowed-metadata-fields` | CN03 | `["category", "public_label"]` |
| `ingestion-quota-per-minute` | CN04 | `30` |
| `burst-count` | CN04 | `50` |
| `vector-index-endpoint` | `@PerPort` CN01, CN12 | HTTPS URL |
| `test-identities` | CN02, CN03, CN05 | same shape as object-storage |

### Integration (`modules/cloud-api-test/privateer-config/<cloud>.yml`)

| Var | Purpose |
|-----|---------|
| `vector-index-name` | OpenSearch / AI Search / Vertex index id |
| `vector-index-endpoint` | API hostname |
| `aws-opensearch-collection-id` | AWS-specific |

---

## CI actions-config (planned)

| File | `privateer-service` | `test-configuration` |
|------|---------------------|----------------------|
| `cfi-testing/actions-config/aws-vector-database-finos.yaml` | `awsVectorDatabase` | `../privateer-config/finos-integration/vector-database/aws-….yml` |

---

## Open questions

- v1 provider: **OpenSearch Serverless** (AWS) vs cheaper exercise stub — cost vs fidelity trade-off?
- CN07: per-cloud exact kNN support matrix — skip GCP if no explicit flag?
- CN03: field-level security on Azure/GCP — partial `@NotTestable` per cloud?
- CN05 rollback: test deny-only v1 vs `@OPT_IN` authorized restore?
- Shared terraform module with `gen-ai` RAG / Bedrock KB vector store?

---

## Review checklist

- [x] All seven native ARs listed with requirement quotes and test approach
- [x] Feature reuse from generic — ten Core imports; **variant CN06/CN07** documented
- [x] Each behavioural AR has trigger + observation + fixtures
- [x] Interface method table with args/returns
- [x] AWS / Azure / GCP matrix filled or unsupported noted
- [x] Integration CSV + privateer vars planned
- [x] CN01/CN06 overlap and CN05 rollback honesty documented
- [x] Only `analysis.md` in this phase
