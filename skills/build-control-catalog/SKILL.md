---
name: build-control-catalog
description: Create a CCC control catalog (controls.yaml) for a cloud service — import applicable core controls, define service-specific controls mapped to identified threats, and include testable assessment requirements that validate against schemas/controls-schema.json. Use when the user asks to "identify controls for `service`", "create a control catalog for `service`", or "create controls.yaml" for a service.
---

# Control Catalog Skill

## Purpose

Identify and create security controls for a cloud service, supporting the onboarding process for new cloud service controls in the CCC repository.

## Final Outcome

A `controls.yaml` file created in the service folder that imports applicable core controls from `catalogs/core/ccc/controls.yaml`, defines service-specific controls mapped to identified threats, includes testable assessment requirements with TLP applicability, and validates against `schemas/controls-schema.json`.

## When to Use

When the user asks to identify or create controls for a cloud service. For example, "Identify controls for `service`", "Create a control catalog for `service`", or "Create controls.yaml for the service in `path`".

## Source Frameworks

Guideline mappings in this catalog draw from the following source frameworks. Only `reference-id` values declared in the service's `metadata.mapping-references` may be used in a control's `guidelines` block, but for this catalog the standard source set is:

| reference-id | Framework | Canonical source URL | Identifier convention used in `entries` |
|---|---|---|---|
| `FS_ISAC` | FS-ISAC (Financial Services Information Sharing and Analysis Center) | https://www.fsisac.com/ | FS-ISAC control / practice reference IDs |
| `NIST_800_53` | NIST SP 800-53 Rev. 5 (Security and Privacy Controls for Information Systems and Organizations) | https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final | Control IDs (e.g., `SC-13`, `AC-3`) |
| `CRI` | Cyber Risk Institute — CRI Profile (Financial Services Cybersecurity Profile) | https://cyberriskinstitute.org/the-profile/ | Diagnostic statement IDs (e.g., `PR.DS-2.1`) |
| `DORA` | Digital Operational Resilience Act — Regulation (EU) 2022/2554 | https://eur-lex.europa.eu/eli/reg/2022/2554/oj/eng | Article / section references (e.g., `Art. 9`) |
| `CRA` | Cyber Resilience Act — Regulation (EU) 2024/2847 | https://eur-lex.europa.eu/eli/reg/2024/2847/oj/eng | Article / annex references (e.g., `Annex I`) |
| `AIGF` | FINOS AI Governance Framework | https://air-governance-framework.finos.org/ | Risk / mitigation IDs (e.g., `mi-1`, `ri-6`) |

> Source notes: NIST 800-53 is also published via DOI `https://doi.org/10.6028/NIST.SP.800-53r5` and in OSCAL (JSON/XML/YAML). The CRI Profile (currently v2.2, aligned to NIST CSF v2) is a free download after registration at the URL above. DORA and CRA texts are the EUR-Lex ELI permalinks (the stable, versioned official records). The AIGF spec is also mirrored at `https://github.com/finos/ai-governance-framework`. Confirm the version/revision in use at onboarding time, since these sources are periodically revised.

### Provenance: knowing where each mapping came from

Every guideline mapping is traceable through a two-part chain, so any control can be audited back to an exact, citable origin:

1. **Source identity + URL** is declared once in `metadata.yaml` under `mapping-references`. Each entry carries the `id` (the `reference-id` used in controls), a human-readable `title`, and the canonical `url` from the table above.

2. **Specific clause** is recorded per control in the `guidelines` block: the framework `reference-id` plus the precise control/article/risk id and its title in `remarks`.

This means the trail for any control is: `control.guidelines[].entries[].reference-id` (the exact clause) → resolved against `metadata.mapping-references[reference-id]` (the source + URL). Declare the references in `metadata.yaml` like so:

```yaml
mapping-references:
  - id: FS_ISAC
    title: FS-ISAC
    url: https://www.fsisac.com/
  - id: NIST_800_53
    title: NIST SP 800-53 Rev. 5
    url: https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
  - id: CRI
    title: Cyber Risk Institute — CRI Profile
    url: https://cyberriskinstitute.org/the-profile/
  - id: DORA
    title: Digital Operational Resilience Act (EU) 2022/2554
    url: https://eur-lex.europa.eu/eli/reg/2022/2554/oj/eng
  - id: CRA
    title: Cyber Resilience Act (EU) 2024/2847
    url: https://eur-lex.europa.eu/eli/reg/2024/2847/oj/eng
  - id: AIGF
    title: FINOS AI Governance Framework
    url: https://air-governance-framework.finos.org/
```

If `metadata.yaml` uses a different `mapping-references` shape (e.g., no `url` field), follow the schema the file already establishes and confirm whether the schema permits a `url`/`source` field before adding one.

## Prerequisites

The target service folder must already contain:

- `metadata.yaml` (provides the service abbreviation, CSP service links, and `mapping-references`)

- `capabilities.yaml` (provides the capability surface controls must protect)

- `threats.yaml` (provides the threats controls must mitigate)

If `metadata.yaml` or `capabilities.yaml` is missing, stop and instruct the user to run the Capability Catalog skill first. If `threats.yaml` is missing, stop and inform the user that threats must be identified before controls can be derived, since every control must map to at least one threat.

## Step 1: Locate Service and Validate Prerequisites

1. Request the target service folder path (e.g., `catalogs/storage/object/`).
   - If no path is given, ask for the service name and resolve the folder under `catalogs/`.
   - If the folder cannot be resolved, list candidate folders and ask for clarification.

2. Verify the prerequisite files listed above exist in the folder.

3. Read `metadata.yaml` and extract:
   - The service abbreviation from `metadata.id` (e.g., `ObjStor` from `CCC.ObjStor`).
   - The `example-csp-services` entries (AWS, Azure, GCP names and documentation links).
   - The `mapping-references` list — only IDs declared here may be used as guideline `reference-id` values later. For this catalog the standard source frameworks are: `FS_ISAC`, `NIST_800_53`, `CRI`, `DORA`, `CRA`, `AIGF`. If `metadata.mapping-references` declares a different or narrower set, defer to what is declared in the file and note the discrepancy.

4. Check whether a `controls.yaml` already exists in the folder and note it.

### Output Format

First output line must be: **Step 1: Locate Service and Validate Prerequisites**

Return the validation result in this format:

Target path: <catalogs/.../...>
Service ID: `CCC.<ABBREVIATION>`
Prerequisites: `metadata.yaml: found|missing` | `capabilities.yaml: found|missing` | `threats.yaml: found|missing`
Existing controls.yaml: `yes|no`
Mapping references: `FS_ISAC, NIST_800_53, CRI, DORA, CRA, AIGF`
Confidence: `High|Medium|Low`

Do not proceed to Step 2 if any prerequisite is missing.

## Step 2: Threat Coverage Review

1. Read `threats.yaml` from the service folder and build the full threat inventory:
   - `imported-threats` entries (core threats, e.g., `CCC.Core.TH01`) with their remarks.
   - Service-specific `threats` entries (e.g., `CCC.<ABBREVIATION>.TH01`) with title and group.

2. Read `capabilities.yaml` to understand which capabilities each threat targets — controls should be feasible given the service's actual feature surface.

3. Every threat in the inventory must be addressed by at least one control (imported or service-specific) by the end of Step 5. Track coverage explicitly.

### Output Format

First output line must be: **Step 2: Threat Coverage Review**

Return the threat inventory in a markdown table:

| Threat ID | Title | Source | Group |
|---|---|---|---|
| CCC.Core.TH01 | `title` | imported | `group` |
| `CCC.<ABBR>.TH01` | `title` | service-specific | `group` |

Total threats requiring coverage: `n`
Confidence: `High|Medium|Low`

## Step 3: Core Control Reuse

1. Read `catalogs/core/ccc/controls.yaml` and review all core controls (`CCC.Core.CN*`), including the threats each one mitigates.

2. Select core controls for import when:
   - The core control mitigates one or more threats in the Step 2 inventory, AND
   - The service's capabilities make the control applicable (e.g., do not import a replication control if the service has no replication capability).

3. Do not plan service-specific controls that duplicate the intent of an imported core control. If a core control such as `CCC.Core.CN01` (Encrypt Data for Transmission) already covers the need, keep it in `imported-controls` only.

4. Compare against a peer catalog in the same category (e.g., `catalogs/storage/object/controls.yaml` for a storage service) as a sanity check on which core controls are conventionally imported.

### Output Format

First output line must be: **Step 3: Core Control Reuse**

Return the selected imports in a markdown table:

| Core Control ID | Title | Mitigates Threats |
|---|---|---|
| CCC.Core.CN01 | `title` | CCC.Core.TH02 |

Threats covered by imports: `n of total`
Confidence: `High|Medium|Low`

## Step 4: Service-Specific Control Identification

1. Identify the threats from Step 2 not yet covered by imported core controls. These drive the service-specific controls.

2. Review the official AWS, Azure, and GCP documentation links from `metadata.yaml` to identify native security features (e.g., key policies, retention locks, network restrictions, versioning) that can be expressed as provider-neutral controls.

3. Prefer granular, service-specific controls over broad umbrella statements when the service behavior is meaningfully distinct. Decompose into the smallest useful control units (e.g., separate untrusted-KMS-key prevention, irrevocable retention policy, uniform access enforcement, and version exposure prevention rather than one "harden storage" control).

4. Each proposed control must:
   - Map to at least one threat from the Step 2 inventory.
   - Be achievable on all three CSPs (provider-neutral), even if implementation differs.
   - Use a `group` id defined in `catalogs/core/ccc/groups.yaml` (e.g., `Encryption`, `Access`, `Observability`, `Data`, `Resource`).

5. Number controls sequentially: `CCC.<ABBREVIATION>.CN01`, `CCC.<ABBREVIATION>.CN02`, ...
   - If updating an existing `controls.yaml`, continue numbering after the highest existing id and do not renumber existing controls.

6. Follow `style-guides/catalogs/control-style-guide.yaml` for titles and objectives:
   - Titles: ≤12 words, title case, imperative action (e.g., "Prevent Bucket Deletion Through Irrevocable Retention Policy").
   - Objectives: multi-line `|` text, begin with "Ensure that..." or similar directive phrase, state the security outcome.

7. Confirm full threat coverage: every threat from Step 2 is mitigated by at least one imported or service-specific control. If a threat cannot reasonably be covered, flag it explicitly with a rationale.

### Output Format

First output line must be: **Step 4: Service-Specific Control Identification**

Return the proposed controls in a markdown table:

| Control ID | Group | Title | Mitigates Threats |
|---|---|---|---|
| `CCC.<ABBR>.CN01` | `group` | `title` | `CCC.<ABBR>.TH01` |

Threat coverage: `n of total` | Uncovered threats: `none | list with rationale`

At the end of Step 4, return a single confirmation block in this format:

Service ID: `CCC.<ABBREVIATION>`
Imported core controls: `n`
Service-specific controls: `n`
Threat coverage: `full|partial`
Target file: <catalogs/.../.../controls.yaml>

Reply with one of the following:

CONFIRM
EDIT

Do not proceed to Step 5 until the user replies CONFIRM. If the user replies EDIT, apply the edits and return the updated Step 4 confirmation block, then wait for CONFIRM.

## Step 5: Create controls.yaml

1. Use `schemas/controls-schema.json` as the source of truth for required and allowed fields.

2. Build `imported-controls` from the confirmed Step 3 selection using the schema shape:

   ```yaml
   imports:
     - reference-id: CCC
       entries:
         - reference-id: CCC.Core.CN01
           remarks: <core control title>
   ```

3. Build `controls` from the confirmed Step 4 list. Each control must include `id`, `group`, `title`, `objective`, and `assessment-requirements`:

   ```yaml
   controls:
     - id: CCC.<ABBREVIATION>.CN01
       group: <Group>
       title: <Control Title>
       objective: |
         Ensure that <security outcome>.
       assessment-requirements:
         - id: CCC.<ABBREVIATION>.CN01.AR01
           text: |
             When <condition>, the service MUST <requirement>.
           applicability:
             - tlp-green
             - tlp-amber
             - tlp-red
           recommendation: |
             <optional implementation guidance>
       threats:
         - reference-id: CCC
           entries:
             - reference-id: CCC.Core.TH01
               remarks: <threat title>
               strength: <1-10>
       guidelines:
         - reference-id: NIST_800_53
           entries:
             - reference-id: SC-13
               remarks: Cryptographic Protection
         - reference-id: CRI
           entries:
             - reference-id: <CRI Profile diagnostic statement id>
               remarks: <diagnostic statement title>
         - reference-id: DORA
           entries:
             - reference-id: <article reference, e.g. Art. 9>
               remarks: <article title>
         - reference-id: FS_ISAC
           entries:
             - reference-id: <FS-ISAC control reference id>
               remarks: <control title>
         - reference-id: CRA
           entries:
             - reference-id: <annex / article reference>
               remarks: <requirement title>
         - reference-id: AIGF
           entries:
             - reference-id: <FINOS AI Governance Framework risk/mitigation id>
               remarks: <risk or mitigation title>
   ```

4. Assessment requirement rules:
   - Number sequentially within each control: `AR01`, `AR02`, ...
   - Use conditional structure: "When [condition], [subject] MUST [requirement]" with RFC 2119 "MUST" for mandatory requirements.
   - Be specific and testable; include technical specifications where applicable (e.g., "TLS 1.3 or higher").
   - Use "AND" to combine multiple mandatory conditions in a single requirement.
   - Assign `applicability` as TLP levels ordered least to most restrictive (`tlp-clear`, `tlp-green`, `tlp-amber`, `tlp-red`). More restrictive requirements typically apply only to `tlp-amber` and `tlp-red`.

5. Threat mapping rules:
   - Every control must reference at least one threat from the Step 2 inventory.
   - Use `strength` (1–10) to indicate how completely the control mitigates the threat, with a brief inline comment justifying the score when partial.

6. Guideline mapping rules:
   - Only use `reference-id` values defined in `metadata.mapping-references`. For this catalog the recognized sources are `FS_ISAC`, `NIST_800_53`, `CRI`, `DORA`, `CRA`, and `AIGF`.
   - Use the identifier convention appropriate to each source: `NIST_800_53` → control IDs (e.g., `SC-13`, `AC-3`); `CRI` → CRI Profile diagnostic statement IDs; `DORA` → article/section references (e.g., `Art. 9`); `CRA` → article/annex references; `FS_ISAC` → control/practice reference IDs; `AIGF` → FINOS AI Governance Framework risk/mitigation IDs.
   - Group entries by framework; include `remarks` with the framework control title for readability.
   - Omit the `guidelines` block entirely (or a specific framework entry) when no confident mapping exists rather than guessing. Do not fabricate control identifiers; map only where the source actually addresses the control's objective.

7. Validate the final object against `schemas/controls-schema.json` before writing the file. Verify every `group` id exists in `catalogs/core/ccc/groups.yaml`, every threat `reference-id` exists in the service `threats.yaml` or core threats, and every guideline `reference-id` is one of the declared `metadata.mapping-references` (`FS_ISAC`, `NIST_800_53`, `CRI`, `DORA`, `CRA`, `AIGF`).

8. Write the file to `<target-path>/controls.yaml`.

9. If a `controls.yaml` already exists, show a diff-style summary and ask for confirmation before overwrite.

### Output Format

First output line must be: **Step 5: Create controls.yaml**

Return the controls creation result in this format:

Controls File: <catalogs/.../.../controls.yaml>
Controls Status: `created|updated|pending-confirmation`
Imported Controls: `n` | Service-Specific Controls: `n` | Assessment Requirements: `n`
Threat Coverage: `full|partial`
Validation: `passed|failed`
Confidence: `High|Medium|Low`
