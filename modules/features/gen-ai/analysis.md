# Behavioural test analysis: Generative AI

- **Catalog**: `catalogs/ai-ml/gen-ai/controls.yaml`
- **Catalog id**: `CCC.GenAI`
- **Features root**: `modules/features/gen-ai/`
- **Shared features root**: `modules/features/generic/` + `modules/features/port/` (`@PerPort`) + `modules/features/vpc/` (CN06)
- **Cloud-api package**: `modules/cloud-api/gen-ai/` (new; add `gen-ai` to [types/test.go](../../../modules/cloud-api/types/test.go) `ServiceTypes`)
- **Factory service id**: `gen-ai`
- **Date**: 2026-06-08

## Summary

The Generative AI catalog defines **eight native controls** with **thirteen ARs** plus **ten imported CCC.Core controls** (CN01–CN07, CN08, CN09, CN11 — no CN10). ARs split into **guardrail/inference probes** (testable with a thin model endpoint + content filters) vs **governance/process** (provenance workflows, red-team programs, citation quality) — latter marked **`@NotTestable`** in CI.

**Seven native ARs are behavioural in v1** (CN01 input block/sanitize, CN02 output reject/redact, **CN03.AR02 approved-source allowlist**, CN04 ingest negative, CN06 plugin least-privilege deny). **CN07** is **behavioural (partial)** — explicit version id on invoke + describe sanity. **Six are not testable** (CN03.AR01 provenance documentation, CN05 RAG citations, CN08 red-team gate — see per-AR notes).

Inherited Core coverage is mostly **tag-only reuse** in `generic/` (CN03, CN05, CN07, CN09, CN11). **Core CN01** (`@PerPort` HTTPS to model API), **CN02** (encryption at rest on knowledge store), and **CN04** (admin/data logging on invoke) need service-specific notes.

Planned service-specific interface: **8–9 methods** plus `generic.Service` embed and `logging.Service` for Core CN04. **CN01/CN02 v1 strategy:** custom **blocked word lists** in guardrails (terraform + config vars) and `ApplyContentFilter` — deterministic, often **without a model invoke**.

## Feature reuse from generic

| Core control | Generic (or shared) feature | Action for this service |
|--------------|----------------------------|-------------------------|
| CCC.Core.CN03 | `generic/CCC.Core/CCC-Core-CN03-AR01.feature` | Add `@gen-ai` to `@NotTestable` |
| CCC.Core.CN04.AR01 | `generic/CCC.Core/CCC-Core-CN04-AR01.feature` | Add `@gen-ai`; `UpdateResourcePolicy` on endpoint/guardrail + `logging.QueryLogs` (`admin`) |
| CCC.Core.CN04.AR02 | `generic/CCC.Core/CCC-Core-CN04-AR02.feature` | Add `@gen-ai`; `TriggerDataWrite` (ingest/index) + `logging.QueryLogs` (`data-write`) |
| CCC.Core.CN04.AR03 | `generic/CCC.Core/CCC-Core-CN04-AR03.feature` | Add `@gen-ai`; `TriggerDataRead` (invoke/query) + `logging.QueryLogs` (`data-read`) |
| CCC.Core.CN05.AR06 | `generic/CCC.Core/CCC-Core-CN05-AR06.feature` | Add `@gen-ai`; identity-scoped `InvokeModel` / `InvokeTool` deny |
| CCC.Core.CN06.AR01 | `vpc/CCC.Core/CCC-Core-CN06-AR01.feature` | Add `@gen-ai`; `GetResourceRegion` on endpoint / knowledge base |
| CCC.Core.CN07.AR01 | `generic/CCC.Core/CCC-Core-CN07-AR01.feature` | Add `@gen-ai` to `@NotTestable` (enumeration alert) |
| CCC.Core.CN08.AR01 | `generic/CCC.Core/CCC-Core-CN10-AR01.feature` or dedicated CN08 | Add `@gen-ai` — replication on RAG store if object-backed; else `@NotTestable` |
| CCC.Core.CN09 | — | `@NotTestable` — log tamper at platform layer |
| CCC.Core.CN10 | — | Not imported |
| CCC.Core.CN11 | — | Describe CMK on knowledge base — `GetEncryptionConfiguration` |
| CCC.Core.CN01.* | `generic/CCC.Core/CCC-Core-CN01-AR*.feature` | Add `@gen-ai` `@PerPort` — TLS to Bedrock / Azure OpenAI / Vertex HTTPS API |

**New-only scenarios (native):**

| AR | Planned feature path |
|----|----------------------|
| CCC.GenAI.CN01.AR01 | `gen-ai/CCC.GenAI/CCC-GenAI-CN01-AR01.feature` (may merge with AR02) |
| CCC.GenAI.CN01.AR02 | `gen-ai/CCC.GenAI/CCC-GenAI-CN01-AR02.feature` |
| CCC.GenAI.CN02.AR01 | `gen-ai/CCC.GenAI/CCC-GenAI-CN02-AR01.feature` |
| CCC.GenAI.CN02.AR02 | `gen-ai/CCC.GenAI/CCC-GenAI-CN02-AR02.feature` |
| CCC.GenAI.CN03.AR01 | `gen-ai/CCC.GenAI/CCC-GenAI-CN03-AR01.feature` (`@NotTestable`) |
| CCC.GenAI.CN03.AR02 | `gen-ai/CCC.GenAI/CCC-GenAI-CN03-AR02.feature` |
| CCC.GenAI.CN04.AR01 | `gen-ai/CCC.GenAI/CCC-GenAI-CN04-AR01.feature` |
| CCC.GenAI.CN04.AR02 | `gen-ai/CCC.GenAI/CCC-GenAI-CN04-AR02.feature` |
| CCC.GenAI.CN05.AR01 | `gen-ai/CCC.GenAI/CCC-GenAI-CN05-AR01.feature` (`@NotTestable`) |
| CCC.GenAI.CN06.AR01 | `gen-ai/CCC.GenAI/CCC-GenAI-CN06-AR01.feature` |
| CCC.GenAI.CN07.AR01 | `gen-ai/CCC.GenAI/CCC-GenAI-CN07-AR01.feature` |
| CCC.GenAI.CN08.AR01 | `gen-ai/CCC.GenAI/CCC-GenAI-CN08-AR01.feature` (`@NotTestable`) |
| CCC.GenAI.CN08.AR02 | `gen-ai/CCC.GenAI/CCC-GenAI-CN08-AR02.feature` (`@NotTestable`) |

## Imported controls

| Reference | Action |
|-----------|--------|
| CCC.Core.CN01 | `@PerPort` TLS probe to model inference HTTPS endpoint |
| CCC.Core.CN02 | **New** describe — `GetEncryptionConfiguration` on knowledge base / artifact store |
| CCC.Core.CN03 | Reuse `generic/CCC-Core-CN03-AR01.feature` — `@NotTestable` |
| CCC.Core.CN04 | Reuse `generic/CCC-Core-CN04-AR0*.feature` — invoke/ingest triggers |
| CCC.Core.CN05 | Extend generic CN05 — `test-user-no-access` invoke/tool deny |
| CCC.Core.CN06 | Reuse `vpc/CCC-Core-CN06-AR01.feature` |
| CCC.Core.CN07 | `@NotTestable` |
| CCC.Core.CN08 | Describe replication on RAG backing store if S3/GCS; else `@NotTestable` |
| CCC.Core.CN09 | `@NotTestable` |
| CCC.Core.CN11 | `GetEncryptionConfiguration` — customer-managed key on KB store |

---

## Assessment requirements (native)

### CCC.GenAI.CN01.AR01 — Validate input before model

- **Requirement**: > Untrusted input such as user queries, RAG data or tool output MUST be validated before it is passed to a GenAI model.
- **Disposition**: Behavioural (combined with CN01.AR02 in v1)
- **Applicability**: tlp-clear, tlp-green, tlp-amber, tlp-red
- **Interpretation**: Every inference request passes through an input guardrail / content filter stage before the foundation model runs. Observable as guardrail invocation metadata or pre-model block.
- **Approach**:
  1. Fixture: guardrail with **custom blocked input terms** (see [Deterministic word-list guardrails](#deterministic-word-list-guardrails-v1-test-strategy)).
  2. `ApplyContentFilter("{guardrail-id}", benignText, direction="input")` → `Blocked=false`.
  3. Optional end-to-end: `SubmitPrompt` with benign text (no blocked term) → `InputValidated=true`.
- **Feature sketch**:
  - When benign prompt is submitted
  - Then request completes without input-block
  - And guardrail / validation stage is recorded in response metadata
- **Config / fixtures**: `finos-ccc-integration-genai-endpoint`, `benign-probe-prompt`, `guardrail-id` from terraform.
- **Gaps / honesty notes**: Proves guardrail is **on the path**, not that every RAG/tool input path is covered — single HTTP invoke entrypoint only.

### CCC.GenAI.CN01.AR02 — Block or sanitise malicious input

- **Requirement**: > If malicious patterns such as prompt injection or sensitive data are detected during input validation, the input MUST be blocked or sanitised.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear, tlp-green, tlp-amber, tlp-red
- **Interpretation**: Adversarial or PII-bearing prompts must not reach the model unchanged — `Blocked` or `Sanitized` with no raw secret in model input.
- **Approach** (deterministic word-list — **preferred v1**):
  1. `blocked-input-terms` in privateer config (e.g. `CCC_PROBE_INPUT_BLOCK`) — same strings in terraform guardrail `wordsConfig` / Azure blocklist / GCP custom filter.
  2. `ApplyContentFilter("{guardrail-id}", "harmless preamble CCC_PROBE_INPUT_BLOCK", direction="input")` → `Blocked=true`, `Reason=word_filter` (exact match).
  3. Optional `@OPT_IN` full-path: `SubmitPrompt` containing blocked term → blocked before model runs.
  4. Optional profiles `pii-ssn-pattern` via guardrail **regex/sensitive-info** filters where cloud supports — secondary to word list.
- **Feature sketch**:
  - When text containing a `blocked-input-terms` entry is filtered
  - Then input is blocked
- **Config / fixtures**: `blocked-input-terms`, `guardrail-id`; terraform creates guardrail with those terms.
- **Gaps / honesty notes**: Word-list block proves **filter fires** — stand-in for “malicious patterns,” not full prompt-injection corpus. Injection/jailbreak prose probes remain `@OPT_IN` where word lists are insufficient.

### CCC.GenAI.CN02.AR01 — Validate model output

- **Requirement**: > GenAI model output MUST be validated for format conformance, malicious patterns, sensitive data and inapropriate content before being passed to users, application or plugins.
- **Disposition**: Behavioural (combined with CN02.AR02 in v1)
- **Applicability**: tlp-clear, tlp-green, tlp-amber, tlp-red
- **Interpretation**: Output passes through post-model policy filter before returning to caller.
- **Approach**:
  1. `ApplyContentFilter("{guardrail-id}", benignCompletion, direction="output")` → `Blocked=false` (output path exercised).
  2. Optional: `InvokeModel` with benign prompt (no blocked output term) → `OutputValidated=true`.
- **Feature sketch**:
  - When model is invoked with output guardrails enabled
  - Then response metadata shows output validation stage executed
- **Config / fixtures**: `output-violation-prompts` (optional, cloud-specific).
- **Gaps / honesty notes**: Eliciting toxic output is non-deterministic — prefer clouds that expose **output filter block** on canned harmful categories (hate/violence) over parsing free text.

### CCC.GenAI.CN02.AR02 — Redact, encode, or reject on output violation

- **Requirement**: > In the event of policy violations, the AI-generated content MUST be redacted, encoded or rejected.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear, tlp-green, tlp-amber, tlp-red
- **Interpretation**: When output filter fires, caller receives reject/empty/redacted body — not raw violating text.
- **Approach** (deterministic word-list — **preferred v1**):
  1. `blocked-output-terms` in config (e.g. `CCC_PROBE_OUTPUT_BLOCK`) — configured on guardrail output filter.
  2. `ApplyContentFilter("{guardrail-id}", "Model says: CCC_PROBE_OUTPUT_BLOCK", direction="output")` → `Blocked=true` — **no model invoke** (synthetic completion text).
  3. Optional `@OPT_IN`: `InvokeModel` with prompt engineered to elicit blocked term — flaky; defer to word-list path.
- **Feature sketch**:
  - When synthetic output contains a `blocked-output-terms` entry
  - Then output is blocked or redacted
- **Config / fixtures**: `blocked-output-terms`, `guardrail-id`.
- **Gaps / honesty notes**: Synthetic output via `ApplyContentFilter` proves **output filter wiring**; full invoke path may still be `@OPT_IN`.

### CCC.GenAI.CN03.AR01 — Approved source and provenance

- **Requirement**: > When data is designated for model training or RAG ingestion, then its source MUST be explicitly approved and its provenance documented.
- **Disposition**: Not testable
- **Applicability**: tlp-clear, tlp-green, tlp-amber, tlp-red
- **Interpretation**: “Provenance **documented**” implies a human/registry workflow beyond an allowlist — not fully API-testable.
- **Approach**: `@NotTestable` stub for documentation workflow; **optional `@OPT_IN` describe** (same fixture as CN03.AR02): `GetKnowledgeBaseSources("{kb-id}")` ⊆ `acceptable-sources` from config — proves sources are **explicitly listed**, not that provenance records exist.
- **Config / fixtures**: `acceptable-sources` JSON array (terraform output) — shared with CN03.AR02.
- **Gaps / honesty notes**: Allowlist describe supports “approved” naming only; does not prove vetting **process** or lineage metadata.

### CCC.GenAI.CN03.AR02 — No unvetted sources in production

- **Requirement**: > Data from unvetted sources MUST NOT be used in production systems.
- **Disposition**: Behavioural (partial)
- **Applicability**: tlp-clear, tlp-green, tlp-amber, tlp-red
- **Interpretation**: Production KB / ingest path must reject data from sources **outside an organisation-defined allowlist** — testable when `acceptable-sources` is explicit in config (same pattern as KeyMgmt `authorized-decrypt-principals`).
- **Approach**:
  1. Terraform: define **`acceptable-sources`** — e.g. `finos-ccc-integration-genai-approved-bucket` (good), plus separate **`finos-ccc-integration-genai-unvetted-bucket`** (bad, not registered on KB). Wire KB connector to **approved sources only**.
  2. `GetKnowledgeBaseSources("{kb-id}")` → every `SourceID` ∈ `acceptable-sources` from privateer config.
  3. `IngestDocument("{kb-id}", sourceID=unvetted-bucket, documentRef, profile="clean")` → **denied** before indexing (source not on allowlist).
  4. Sanity: `IngestDocument` from **approved** source with `profile="clean"` → `indexed` (proves gate is source-scoped, not blanket deny).
- **Feature sketch**:
  - Background: `acceptable-sources` from config; KB `{uid}` production fixture.
  - When ingest is attempted from a source not in `acceptable-sources`
  - Then ingest is denied
  - And configured KB sources are a subset of `acceptable-sources`
- **Config / fixtures**: `acceptable-sources` (list of bucket URIs / connector ids), `unvetted-source-id`, `approved-source-id`; terraform registers only approved connector on KB.
- **Gaps / honesty notes**:
  - Proves **allowlist enforcement** on the integration KB — not org-wide “every production system” coverage.
  - Enforcement may be terraform-only (connector not creatable for bad bucket) **or** runtime reject in harness — prefer **runtime negative ingest** where API allows ingest from arbitrary URI.
  - Distinct from CN04: CN03 blocks **unapproved origin**; CN04 blocks **poison content** from an otherwise approved source.

### CCC.GenAI.CN04.AR01 — Validate ingested data

- **Requirement**: > When data is ingested for training, fine-tuning or conversion to vector embeddings, it MUST be validated for sensitive information or malicious content.
- **Disposition**: Behavioural (requires RAG / KB fixture)
- **Applicability**: tlp-clear, tlp-green, tlp-amber, tlp-red
- **Interpretation**: Ingestion pipeline runs validation before embeddings are stored.
- **Approach**:
  1. Terraform: knowledge base / corpus connector with ingest-time content filter (Bedrock KB ingest filter, Vertex RAG corpus policy, Azure AI Search skill — per cloud honesty).
  2. `IngestDocument("{kb-id}", sourceID=approved-source-id, document, profile="poison")` — document contains injection string or fake PII from `ingest-poison-fixtures` config (approved source only — CN03 gate already satisfied).
  3. Assert ingest status `Rejected` or `Quarantined` OR document not queryable post-ingest.
- **Feature sketch**:
  - When poison document is ingested
  - Then validation fails or document is not indexed
- **Config / fixtures**: `finos-ccc-integration-genai-kb`, `ingest-poison-document-id`.
- **Gaps / honesty notes**: Skip with `@OPT_IN` if cloud lacks ingest-time filter API — mark unsupported cells. Training/fine-tune ingest may differ from RAG embed path.

### CCC.GenAI.CN04.AR02 — Reject, redact, or flag on ingest violation

- **Requirement**: > If sensitive data or malicious content is detected, it must be rejected, redacted or flagged for manual review.
- **Disposition**: Behavioural (same flow as CN04.AR01)
- **Applicability**: tlp-clear, tlp-green, tlp-amber, tlp-red
- **Interpretation**: Observable outcome of CN04 ingest probe — `Rejected`, `Redacted`, or `PendingReview` status.
- **Approach**: Same as CN04.AR01 step 3 — assert `IngestResult.Action` in `{rejected, redacted, flagged}`.
- **Feature sketch**:
  - When poison document ingest completes or fails
  - Then result is rejected, redacted, or flagged — not silently indexed
- **Config / fixtures**: Same as CN04.AR01.
- **Gaps / honesty notes**: “Flagged for manual review” may be async — prefer **rejected** assertion in v1.

### CCC.GenAI.CN05.AR01 — RAG citations in responses

- **Requirement**: > When a RAG-enabled system generates a response containing information retrieved from its knowledge base, then the response MUST include a verifiable citation that links back to the specific source document.
- **Disposition**: Not testable
- **Applicability**: tlp-clear, tlp-green, tlp-amber, tlp-red
- **Interpretation**: Citation presence and correctness depend on model behaviour and retrieval — non-deterministic, eval-heavy.
- **Approach**: `@NotTestable` stub; optional manual eval / offline RAGAS checklist referenced in comment.
- **Config / fixtures**: N/A.
- **Gaps / honesty notes**: Could become `@OPT_IN` if cloud returns structured `citations[]` metadata on KB retrieve-and-generate API — still flaky for “verifiable link” assertion in CI.

### CCC.GenAI.CN06.AR01 — Least privilege for plugins / tools

- **Requirement**: > When an LLM invokes an external tool (e.g., an API, a plugin), then the tool MUST operate with the least privileges required for performing its intended functionality.
- **Disposition**: Behavioural
- **Applicability**: tlp-clear, tlp-green, tlp-amber, tlp-red
- **Interpretation**: Tool execution identity is scoped — over-privileged caller or disallowed action → deny; describe shows tool role lacks excess permissions.
- **Approach**:
  1. Terraform: register `finos-ccc-integration-genai-plugin` with minimal IAM / managed identity (read-only on probe resource).
  2. `InvokeTool("{endpoint-id}", toolName, action="allowed")` as trusted identity → success.
  3. `InvokeTool(..., action="escalated")` as `test-user-no-access` OR action outside tool scope → deny.
  4. Optional: `GetToolPrincipalPermissions` describe → no `*` admin actions.
- **Feature sketch**:
  - When tool is invoked outside granted scope
  - Then invocation is denied
- **Config / fixtures**: `plugin-tool-name`, `plugin-allowed-action`, `plugin-denied-action`, `test-user-no-access`.
- **Gaps / honesty notes**: Agent frameworks (Bedrock Agents, Vertex extensions) differ — may simulate tool via Lambda / Cloud Function with IAM boundary.

### CCC.GenAI.CN07.AR01 — Explicit model version on production calls

- **Requirement**: > When an application makes an API call to a foundational model in a production environment, then it MUST specify an explicit version identifier.
- **Disposition**: Behavioural (partial)
- **Applicability**: tlp-clear, tlp-green, tlp-amber, tlp-red
- **Interpretation**: Inference requests include pinned model version / deployment id — not “latest” alias in production fixture.
- **Approach**:
  1. Terraform pins `model-version-id` on endpoint (Bedrock model ARN with version, Azure deployment name, Vertex `model@version`).
  2. `GetDeployedModelVersion("{endpoint-id}")` → equals `pinned-model-version` from config.
  3. `InvokeModel` harness asserts request payload includes explicit version (capture in adapter) — omit-version call to prod endpoint **rejected or maps only to pinned id** per cloud honesty.
- **Feature sketch**:
  - When model endpoint is described
  - Then deployed version matches `pinned-model-version`
  - When invoke omits version on production endpoint
  - Then call fails or uses only pinned id (cloud-specific)
- **Config / fixtures**: `pinned-model-version`, `finos-ccc-integration-genai-endpoint`.
- **Gaps / honesty notes**: Describe-only proves **endpoint pin**, not every application in org; invoke capture proves **test harness** compliance. “$LATEST” / default deployment aliases fail describe check — intentional.

### CCC.GenAI.CN08.AR01 — Red team before production

- **Requirement**: > When a new AI model is considered for production deployment, it MUST undergo a formal red teaming and quality assurance review.
- **Disposition**: Not testable
- **Applicability**: tlp-clear, tlp-green, tlp-amber, tlp-red
- **Interpretation**: Formal human process / sign-off — not API-triggerable in CI.
- **Approach**: `@NotTestable` stub; optional terraform tag `red-team-status=approved` for policy scan only.
- **Config / fixtures**: N/A.
- **Gaps / honesty notes**: Cannot prove review **occurred** — only tag if present.

### CCC.GenAI.CN08.AR02 — Block deploy on unacceptable risk

- **Requirement**: > If model quality review or red teaming identifies an issue that exceeds the organization's risk tolerance, the model MUST NOT be deployed until the issue is remediated.
- **Disposition**: Not testable
- **Applicability**: tlp-clear, tlp-green, tlp-amber, tlp-red
- **Interpretation**: Deployment gate tied to human risk acceptance.
- **Approach**: `@NotTestable` stub paired with CN08.AR01.
- **Config / fixtures**: N/A.
- **Gaps / honesty notes**: No cloud API exposes “risk tolerance exceeded” as machine-verifiable state.

---

## Assessment requirements (inherited Core — summary)

| Core AR | Disposition | Approach |
|---------|-------------|----------|
| CCC.Core.CN01 | `@PerPort` | TLS probe to inference API hostname |
| CCC.Core.CN02 | Behavioural (describe) | `GetEncryptionConfiguration` on KB / artifact bucket |
| CCC.Core.CN03 | `@NotTestable` | Account MFA |
| CCC.Core.CN04 | Behavioural | Tag generic; invoke/ingest/policy change + `logging.QueryLogs` |
| CCC.Core.CN05 | Behavioural | Tag generic; `test-user-no-access` invoke deny |
| CCC.Core.CN06 | Behavioural | Tag `vpc/CCC-Core-CN06-AR01` |
| CCC.Core.CN07 | `@NotTestable` | Enumeration alert |
| CCC.Core.CN08 | Describe or `@NotTestable` | KB backing store replication if object storage |
| CCC.Core.CN09 | `@NotTestable` | Platform log tamper |
| CCC.Core.CN11 | Behavioural (describe) | CMK on encrypted KB store |

---

## Deterministic word-list guardrails (v1 test strategy)

**Yes** — all three clouds support **configurable blocked terms** on input and/or output. Defining probe tokens in terraform + privateer config makes CN01/CN02 **deterministic** (exact match) and often **cheaper** than eliciting violations from a live model.

| Cloud | Define blocked words | Test filter without model invoke |
|-------|----------------------|----------------------------------|
| **AWS** | Bedrock `CreateGuardrail` / `UpdateGuardrail` → `wordPolicyConfig.wordsConfig[]` with `inputEnabled` / `outputEnabled`, `inputAction` / `outputAction` = `BLOCK` | `ApplyGuardrail` on input or **synthetic output text** |
| **Azure** | [Content Safety text blocklists](https://learn.microsoft.com/azure/ai-services/content-safety/concepts/blocklists) + attach to Azure OpenAI deployment content filter | `AnalyzeText` / content filter API on probe strings |
| **GCP** | Vertex **Model Armor** custom word filters, or safety + regex where available; basic `safetySettings` alone are category-only | Model Armor `sanitizeUserPrompt` / `sanitizeModelResponse` (or equivalent) |

**Recommended probe tokens** (unlikely in natural traffic):

```yaml
blocked-input-terms:
  - CCC_PROBE_INPUT_BLOCK
blocked-output-terms:
  - CCC_PROBE_OUTPUT_BLOCK
```

Terraform creates the guardrail/blocklist with these terms. Tests read the same vars — no magic strings in feature files.

**Where to define terms (pick one):**

| Mechanism | Use |
|-----------|-----|
| **Terraform only** (preferred) | Guardrail created with word list; tests only **read** via `GetGuardrailBlockedTerms` + `ApplyContentFilter` |
| **`UpdateGuardrailWordList` method** | Wraps `UpdateGuardrail` / blocklist PATCH — for integration CSV admin path; **avoid in behavioural features** (mutates shared fixture) |
| **Privateer vars** | Source of truth for probe strings; must match terraform outputs |

**Test flow (no model tokens):**

1. `GetGuardrailBlockedTerms("{guardrail-id}")` → contains `CCC_PROBE_INPUT_BLOCK` / `CCC_PROBE_OUTPUT_BLOCK`.
2. `ApplyContentFilter(guardrail, "text with CCC_PROBE_INPUT_BLOCK", input)` → blocked.
3. `ApplyContentFilter(guardrail, "text with CCC_PROBE_OUTPUT_BLOCK", output)` → blocked.
4. `ApplyContentFilter(guardrail, "benign text", input)` → not blocked.

Optional fifth step: `SubmitPrompt` / `InvokeModel` with guardrail attached — `@OPT_IN` end-to-end confirmation.

---

## Cloud-api interface (minimal)

### `gen-ai.Service`

| Method | Used by AR(s) | Args | Returns (key fields) |
|--------|---------------|------|----------------------|
| `SubmitPrompt` | CN01.AR01, CN01.AR02 | `endpointID`, `prompt`, `profile string` | `Blocked`, `Sanitized`, `InputValidated`, `Reason`, `Completion` |
| `InvokeModel` | CN02.AR01, CN02.AR02, CN07 | `endpointID`, `prompt`, `profile string` | `OutputBlocked`, `Redacted`, `OutputValidated`, `Completion`, `ModelVersionUsed` |
| `IngestDocument` | CN03.AR02, CN04.AR01, CN04.AR02 | `kbID`, `sourceID`, `documentRef`, `profile string` | `Action` (`rejected`/`redacted`/`flagged`/`indexed`), `DocumentID`, `DeniedReason` |
| `GetKnowledgeBaseSources` | CN03.AR01 (`@OPT_IN`), CN03.AR02 | `kbID string` | `SourceIDs[]` |
| `InvokeTool` | CN06 | `endpointID`, `toolName`, `action string` | `Allowed`, `Error` |
| `GetDeployedModelVersion` | CN07 | `endpointID string` | `VersionID`, `IsPinned` |
| `GetToolPrincipalPermissions` | CN06 (optional describe) | `endpointID`, `toolName` | `Actions[]`, `OverPrivileged bool` |
| `GetEncryptionConfiguration` | Core CN02, CN11 | `resourceID string` | `EncryptionEnabled`, `KMSKeyID` |
| `GetGuardrailConfiguration` | CN01/CN02 sanity | `guardrailID string` | `InputFilterEnabled`, `OutputFilterEnabled` |
| `GetGuardrailBlockedTerms` | CN01, CN02 | `guardrailID string` | `InputTerms[]`, `OutputTerms[]` |
| `UpdateGuardrailWordList` | Integration / Core CN04 admin | `guardrailID`, `inputTerms[]`, `outputTerms[]` | error — **terraform preferred** for behavioural tests |
| `ApplyContentFilter` | CN01.AR02, CN02.AR02 (**primary**) | `guardrailID`, `text`, `direction` (`input`\|`output`) | `Blocked`, `Sanitized`, `Reason` |

Embed `generic.Service` for `GetOrProvisionTestableResources`, `UpdateResourcePolicy`, `TriggerDataRead`/`Write`, `GetResourceRegion`, `CheckUserProvisioned`, `TearDown`.

### `logging.Service` (second service)

| logType | AR(s) | resourceID meaning |
|---------|-------|-------------------|
| `admin` | Core CN04.AR01 | Endpoint / guardrail / KB config changes |
| `data-read` | Core CN04.AR03 | Model invoke / retrieve |
| `data-write` | Core CN04.AR02 | Document ingest / index |

### `generic.Service` methods used

| Method | AR(s) |
|--------|-------|
| `GetOrProvisionTestableResources` | factory wiring |
| `CheckUserProvisioned` | endpoint exists |
| `UpdateResourcePolicy` | Core CN04.AR01 |
| `TriggerDataRead` / `TriggerDataWrite` | Core CN04 |
| `GetResourceRegion` | Core CN06 |
| `TearDown` | cleanup |

---

## Cross-cloud implementation

| Method | AWS | Azure | GCP |
|--------|-----|-------|-----|
| `SubmitPrompt` | Bedrock `InvokeModel` + guardrail `guardrailIdentifier` | Azure OpenAI + content filter | Vertex `generateContent` + safety settings |
| `InvokeModel` | Bedrock guardrail interleaved on output | Content filter on completion | `safetySettings` block / blockReason |
| `IngestDocument` | Bedrock KB ingest; reject if `sourceID` ∉ allowlist | AI Search datasource guard | Vertex corpus import + source URI check |
| `GetKnowledgeBaseSources` | `ListDataSources` on KB | Indexer datasource names | Corpus `sourceGcsUris` / registered sources |
| `InvokeTool` | Bedrock Agent action group → Lambda IAM role | AOAI + Function / APIM backend MI | Vertex extension / Cloud Function |
| `GetDeployedModelVersion` | Model ARN includes version | Deployment name (pinned) | `publisher/model@version` |
| `GetEncryptionConfiguration` | KB S3 SSE-KMS | Storage CMK | CMEK on corpus bucket |
| `GetGuardrailConfiguration` | `GetGuardrail` | Content filter on deployment | Model Armor / safety config |
| `GetGuardrailBlockedTerms` | `wordPolicyConfig.wordsConfig` | Blocklist terms on deployment | Model Armor word lists |
| `UpdateGuardrailWordList` | `UpdateGuardrail` | Blocklist PATCH | Model Armor update API |
| `ApplyContentFilter` | `ApplyGuardrail` | Content Safety `AnalyzeText` | `sanitizeUserPrompt` / `sanitizeModelResponse` |

**Prerequisites:** `guardrail-id`, `blocked-input-terms`, `blocked-output-terms`, `pinned-model-version`, `kb-id` from privateer vars — no discovery.

**Unsupported honesty:** CN04 ingest filter — mark `—` if KB ingest API lacks reject path; CN05 citations — all clouds flaky for CI.

### Per-method notes

#### `ApplyContentFilter` (preferred for CN01/CN02)

- **AWS**: `ApplyGuardrail` with `guardrailIdentifier`; pass synthetic text; check `action == GUARDRAIL_INTERVENED` for blocked terms.
- **Azure**: Content Safety analyze with deployment blocklist attached; or pre-deployment filter test endpoint.
- **GCP**: Model Armor sanitize APIs when available; else `@OPT_IN` category filters only.

#### `SubmitPrompt` / `InvokeModel` (`@OPT_IN` end-to-end)

- Use only when word-list + `ApplyContentFilter` path is insufficient; smallest/cheapest model; minimize tokens.

#### `InvokeTool`

- **AWS**: Lambda with IAM role `finos-ccc-integration-genai-plugin-role` — allow `s3:GetObject` on probe prefix only; deny `s3:DeleteObject`.
- **Azure**: Managed identity on Function with parallel scope.
- **GCP**: SA with `roles/storage.objectViewer` on probe bucket only.

---

## Terraform fixtures (planned)

| Fixture | Role | AR(s) |
|---------|------|-------|
| `finos-ccc-integration-genai-endpoint` | Pinned model + guardrails on | CN01, CN02, CN07 |
| `finos-ccc-integration-genai-guardrail` | `wordsConfig` / blocklist with `CCC_PROBE_*` terms | CN01, CN02 |
| `blocked-input-terms` / `blocked-output-terms` | Terraform output → privateer vars | CN01, CN02 |
| `finos-ccc-integration-genai-kb` | RAG corpus; connectors on approved sources only | CN03, CN04 |
| `finos-ccc-integration-genai-approved-bucket` | Allowlisted ingest origin | CN03, CN04 |
| `finos-ccc-integration-genai-unvetted-bucket` | Deliberately **not** on KB / allowlist | CN03.AR02 negative |
| `acceptable-sources` | Terraform output → privateer var | CN03 |
| `finos-ccc-integration-genai-plugin` | Tool + least-privilege IAM/MI | CN06 |
| `ingest-poison-fixtures` | Static poison doc in **approved** bucket | CN04 |

Submodule: `modules/cloud-api-test/terraform/<cloud>/modules/gen-ai/`.

**Cost control (v1):** **`ApplyContentFilter` first** — no model tokens for CN01/CN02; cap `InvokeModel` rows to `@OPT_IN`; KB ingest `@OPT_IN`.

---

## Integration test coverage (planned)

| api | method | cloud | expect_error | arg1 | arg2 | Notes |
|-----|--------|-------|--------------|------|------|-------|
| `gen-ai` | `GetOrProvisionTestableResources` | all | | | | factory |
| `gen-ai` | `CheckUserProvisioned` | all | | main | | endpoint exists |
| `gen-ai` | `GetGuardrailBlockedTerms` | all | | guardrail | | CN01/CN02 — terms present |
| `gen-ai` | `ApplyContentFilter` | all | true | guardrail | `input-block` | CN01.AR02 — blocked input term |
| `gen-ai` | `ApplyContentFilter` | all | true | guardrail | `output-block` | CN02.AR02 — blocked output term |
| `gen-ai` | `ApplyContentFilter` | all | | guardrail | `benign-input` | CN01 — not blocked |
| `gen-ai` | `UpdateGuardrailWordList` | all | | guardrail | | admin API exercise — optional |
| `gen-ai` | `SubmitPrompt` | all | | main | `benign` | `@OPT_IN` end-to-end |
| `gen-ai` | `InvokeTool` | all | true | main | `escalated` | CN06 — deny |
| `gen-ai` | `GetDeployedModelVersion` | all | | main | | CN07 — matches pinned |
| `gen-ai` | `GetKnowledgeBaseSources` | all | | kb | | CN03 — ⊆ `acceptable-sources` |
| `gen-ai` | `IngestDocument` | all | true | kb | `unvetted-source` | CN03.AR02 — source deny |
| `gen-ai` | `IngestDocument` | all | true | kb | `poison` | CN04 — `@OPT_IN`, approved source |
| `gen-ai` | `GetGuardrailConfiguration` | all | | main | | optional sanity |
| `logging` | `QueryLogs` | all | | main | `data-read`, `60` | Core CN04 after invoke |

---

## Privateer config (planned vars)

### Behavioural (`cfi-testing/privateer-config/finos-integration/gen-ai/`)

| Var | Purpose | Example |
|-----|---------|---------|
| `service` / `service-type` | factory id | `gen-ai` |
| `tags` | scenario filter | `@Behavioural @gen-ai` |
| `resource` | endpoint filter | `finos-ccc-integration-genai-endpoint` |
| `pinned-model-version` | CN07 | `anthropic.claude-3-haiku-20240307-v1:0` |
| `guardrail-id` | CN01/CN02 | from terraform output |
| `blocked-input-terms` | CN01.AR02 | `["CCC_PROBE_INPUT_BLOCK"]` |
| `blocked-output-terms` | CN02.AR02 | `["CCC_PROBE_OUTPUT_BLOCK"]` |
| `kb-id` | CN03, CN04 | `finos-ccc-integration-genai-kb` |
| `acceptable-sources` | CN03 | `["s3://finos-ccc-integration-genai-approved-bucket/"]` |
| `approved-source-id` | CN03, CN04 | approved bucket / connector id |
| `unvetted-source-id` | CN03.AR02 | unvetted bucket / connector id |
| `plugin-tool-name` | CN06 | `finos-ccc-integration-genai-plugin` |
| `test-identities` | Core CN05, CN06 | same shape as object-storage |

### Integration (`modules/cloud-api-test/privateer-config/<cloud>.yml`)

| Var | Purpose |
|-----|---------|
| `genai-endpoint-id` | Bedrock / deployment / Vertex endpoint |
| `genai-guardrail-id` | Guardrail resource |
| `genai-kb-id` | Knowledge base id |

---

## CI actions-config (planned)

| File | `privateer-service` | `test-configuration` |
|------|---------------------|----------------------|
| `cfi-testing/actions-config/aws-gen-ai-finos.yaml` | `awsGenAI` | `../privateer-config/finos-integration/gen-ai/aws-….yml` |

---

## Open questions

- GCP: Model Armor required for custom word lists, or accept category-only filters with reduced CN01/CN02 honesty?
- CN04: Bedrock KB ingest filter vs post-hoc index scan — which cloud paths are honest in v1?
- CN05: defer entirely or `@OPT_IN` when API returns structured `citations[]`?
- Share `gen-ai` terraform submodule with `vector-database` RAG fixtures?

---

## Review checklist

- [x] All thirteen native ARs listed with requirement quotes and test approach
- [x] Feature reuse from generic — ten Core imports
- [x] Each behavioural AR has trigger + observation + fixtures
- [x] Interface method table with args/returns; no duplicate log query on gen-ai interface
- [x] AWS / Azure / GCP matrix filled or unsupported noted
- [x] Integration CSV + privateer vars planned
- [x] CN03.AR02 allowlist behavioural; CN03.AR01 provenance docs `@NotTestable`; CN05/CN08 honestly not testable
- [x] Only `analysis.md` in this phase
