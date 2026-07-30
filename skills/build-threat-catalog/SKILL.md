---
name: build-threat-catalog
description: Create a CCC threat catalog (threats.yaml) for a cloud service — import applicable core threats, define service-specific threats mapped to the service's capabilities, and map each to external frameworks (MITRE ATT&CK, MITRE D3FEND, CISA KEV, CWE, OWASP) via standalone Gemara MappingDocuments in the service's mappings/ directory, validating against schemas/threats-schema.json and schemas/mappingdocument-schema.json. Requires the service folder to already contain metadata.yaml and capabilities.yaml. Use when the user asks to "identify threats for `service`", "create a threat catalog for `service`", or "create threats.yaml" for a service.
---

# Threat Catalog Skill

## Purpose

Identify and create security threats for a cloud service, supporting the onboarding process for new cloud service threats in the CCC repository. This is the bridge between capabilities and controls: capabilities define what the service can do, threats define what can go wrong, and controls mitigate the threats.

## Final Outcome

A `threats.yaml` file created in the service folder that imports applicable core threats from `catalogs/core/core/threats.yaml`, defines service-specific threats mapped to the service's capabilities, and grounds each threat in current adversary and exploitation evidence, validated against `schemas/threats-schema.json` — plus one standalone Gemara MappingDocument per external framework in the service's `mappings/` directory (`mappings/threats-<framework>.yaml`, validated against `schemas/mappingdocument-schema.json`) connecting the threats to adversary techniques (MITRE ATT&CK), defensive countermeasures (MITRE D3FEND), known exploited vulnerabilities (CISA KEV), and weakness taxonomies (CWE, OWASP). Threats never carry inline `external-mappings`; that field is not part of the schema.

## When to Use

When the user asks to identify or create threats for a cloud service. For example, "Identify threats for `service`", "Create a threat catalog for `service`", or "Create threats.yaml for the service in `path`".

## Prerequisites

The target service folder must already contain:

- `metadata.yaml` (provides the service abbreviation, CSP service links, and `mapping-references`)

- `capabilities.yaml` (provides the capability surface threats are mapped against)

If either file is missing, stop and instruct the user to run the Capability Catalog skill first, since every threat must map to at least one capability.

## Reference Sources

These four sources feed threat work along two distinct axes. **Discovery** sources inform *what* threats exist and *whether they are realistic*; they are consulted during Step 3/4 reasoning and need not appear in the YAML. **Mapping** sources become standalone MappingDocuments in the service's `mappings/` directory (one document per framework, Step 6) and are gated by `metadata.mapping-references` (see the gate rule below).

| Source | `reference-id` | Role | Entry ID format | Canonical source |
|---|---|---|---|---|
| MITRE ATT&CK (Enterprise — cloud platforms: IaaS, SaaS, Identity Provider, Office Suite) | `MITRE-ATT&CK` | Discovery + Mapping | `Txxxx`, `Txxxx.xxx` | attack.mitre.org |
| MITRE D3FEND (v1.x knowledge graph of countermeasures) | `D3FEND` | Mapping (threat → countermeasure bridge to controls) | `D3-XXX` (e.g. `D3-NTA`) | d3fend.mitre.org |
| CISA Known Exploited Vulnerabilities Catalog | `CISA-KEV` | Discovery + Mapping (sparingly, as exploitation evidence) | `CVE-YYYY-NNNNN` | cisa.gov/known-exploited-vulnerabilities-catalog; JSON feed at `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` (GitHub mirror: `cisagov/kev-data`) |
| CSP Security Advisories (AWS / Azure / GCP) | remarks-level by default, or `CSP-Advisory` if declared | Discovery + Evidence | provider-specific (`AWS-YYYY-NNN`, MSRC `ADV`/`CVE`, `GCP-YYYY-NNN`) | AWS: aws.amazon.com/security/security-bulletins · Azure: msrc.microsoft.com + service bulletins on learn.microsoft.com · GCP: cloud.google.com/support/bulletins |
| CWE / OWASP Top 10 (unchanged) | `CWE`, `OWASP-Top-10` | Mapping | `CWE-nnn`, `Axx:YYYY` | cwe.mitre.org · owasp.org |

**Source-role notes — read before mapping:**

- **MITRE ATT&CK** is the primary discovery lens for adversary behaviour. Prefer techniques drawn from the Enterprise cloud platforms over generic endpoint techniques, and prefer a specific sub-technique (`Txxxx.xxx`) over its parent when one applies.

- **MITRE D3FEND** describes *countermeasures*, not threats, so it is the forward-link to the Control Catalog rather than a description of the risk itself. Derive D3FEND techniques from a threat's ATT&CK mapping (D3FEND maps countermeasures to the ATT&CK techniques they counter via the Digital Artifact Ontology) and record them as "the defensive technique classes that address this threat." Treat D3FEND mappings as optional; omit when no ATT&CK anchor exists.

- **CISA KEV** is product- and CVE-specific, whereas CCC threats are provider-neutral and capability-based. Use KEV mainly to confirm *realizability* (Step 4) — if a weakness class in this service category appears in KEV, the threat is demonstrably live. Emit a `CISA-KEV` external mapping only when a threat corresponds directly to a class of weakness with KEV entries, cite one or two representative CVE IDs, and make the `remarks` state that the CVE is illustrative evidence (with the affected product and `dateAdded`). Never invent a 1:1 threat→CVE mapping to fill the block.

- **CSP Security Advisories** are not a stable framework with durable mapping IDs. By default they are a discovery and grounding source: use them in Step 4 to find documented, real-world failure modes for each capability across AWS, Azure, and GCP, and cite the relevant advisory in a threat's `remarks`. Only emit a structured `CSP-Advisory` external mapping if the team has explicitly declared `CSP-Advisory` in `metadata.mapping-references`.

**Mapping-reference gate.** A framework may get a MappingDocument only if its `reference-id` is declared in `metadata.mapping-references`. If `MITRE-ATT&CK`, `D3FEND`, or `CISA-KEV` is not yet declared:

1. Still use it for discovery and realizability reasoning, and for `remarks`.

2. Do not create a mapping document for it.

3. Surface a recommendation in the Step 4 confirmation block to add the missing `reference-id`(s) to `metadata.mapping-references` (this is the metadata/Capability Catalog skill's responsibility, not this skill's — do not edit `metadata.yaml` here).

## Step 1: Locate Service and Validate Prerequisites

1. Request the target service folder path (e.g., `catalogs/storage/object/`).
   - If no path is given, ask for the service name and resolve the folder under `catalogs/`.
   - If the folder cannot be resolved, list candidate folders and ask for clarification.

2. Verify the prerequisite files exist in the folder.

3. Read `metadata.yaml` and extract:
   - The service abbreviation from `metadata.id` (e.g., `ObjStor` from `CCC.ObjStor`).
   - The `example-csp-services` entries (AWS, Azure, GCP names and documentation links).
   - The `mapping-references` list — only these frameworks may receive MappingDocuments later.

4. Check whether a `threats.yaml` already exists in the folder and note it.

5. Compare the declared `mapping-references` against the Reference Sources table. Note which of `MITRE-ATT&CK`, `D3FEND`, and `CISA-KEV` are declared (usable as mappings) versus undeclared (discovery-only, per the mapping-reference gate).

### Output Format

First output line must be: **Step 1: Locate Service and Validate Prerequisites**

Return the validation result in this format:

Target path: <catalogs/.../...>
Service ID: `CCC.<ABBREVIATION>`
Prerequisites: `metadata.yaml: found|missing` | `capabilities.yaml: found|missing`
Existing threats.yaml: `yes|no`
Mapping references (declared): `MITRE-ATT&CK, D3FEND, CISA-KEV, CWE, ...`
Mapping sources usable: `list declared` | Discovery-only (undeclared): `list undeclared`
Confidence: `High|Medium|Low`

Do not proceed to Step 2 if any prerequisite is missing.

## Step 2: Capability Surface Review

1. Read `capabilities.yaml` from the service folder and build the full capability inventory:
   - `imported-capabilities` entries (core capabilities, e.g., `CCC.Core.CP11`) with their remarks.
   - Service-specific `capabilities` entries (e.g., `CCC.<ABBREVIATION>.CP01`) with title and group.

2. Each capability represents an attack surface. Every service-specific threat must map to at least one capability it puts at risk. Track this mapping explicitly.

3. Review the official AWS, Azure, and GCP documentation links from `metadata.yaml` to understand how each capability is exposed and where misconfiguration or abuse is feasible.

### Output Format

First output line must be: **Step 2: Capability Surface Review**

Return the capability inventory in a markdown table:

| Capability ID | Title | Source | Group |
|---|---|---|---|
| CCC.Core.CP11 | `title` | imported | `group` |
| `CCC.<ABBR>.CP01` | `title` | service-specific | `group` |

Total capabilities forming the attack surface: `n`
Confidence: `High|Medium|Low`

## Step 3: Core Threat Reuse

1. Read `catalogs/core/core/threats.yaml` and review all core threats (`CCC.Core.TH*`).

2. Select core threats for import when the threat applies to one or more of the service's capabilities (e.g., import `CCC.Core.TH02` "Data is Intercepted in Transit" only if the service transmits data over the network).

3. Do not plan service-specific threats that duplicate the intent of an imported core threat. If a core threat such as `CCC.Core.TH01` (Access Control is Misconfigured) already covers the risk generically, keep it in `imported-threats` only and reserve service-specific threats for risks unique to this service's behavior.

4. Compare against a peer catalog in the same category (e.g., `catalogs/storage/object/threats.yaml` for a storage service) as a sanity check on which core threats are conventionally imported.

### Output Format

First output line must be: **Step 3: Core Threat Reuse**

Return the selected imports in a markdown table:

| Core Threat ID | Title | Applies To Capability |
|---|---|---|
| CCC.Core.TH02 | `title` | `CCC.<ABBR>.CP03` |

Confidence: `High|Medium|Low`

## Step 4: Service-Specific Threat Identification

### 4a. Source-driven discovery

Before drafting threats, work each capability from the Step 2 inventory against the discovery sources in the Reference Sources table. This grounds the catalog in real adversary behaviour and demonstrated exploitation rather than speculation:

1. **MITRE ATT&CK** — for each capability, identify the adversary techniques feasible on that surface, drawing from the Enterprise cloud platforms (IaaS, SaaS, Identity Provider, Office Suite). These technique IDs seed both the threat statement and its `MITRE-ATT&CK` mapping.

2. **CISA KEV** — check whether weaknesses in this service category (or its common implementation patterns) appear in the KEV catalog. A KEV hit is strong evidence that the threat is realizable in the wild and should raise the threat's priority; record representative CVE IDs and their `dateAdded` for use in `remarks` or, where the gate allows, a sparing `CISA-KEV` mapping.

3. **CSP Security Advisories** — review the AWS, Azure, and GCP security bulletins for the services behind each capability (see Reference Sources for URLs) to surface documented, provider-side failure modes. Use these to make threats concrete and provider-neutral (a real issue on one CSP usually points to an analogous risk on the others). Cite the advisory in the threat's `remarks`.

4. **MITRE D3FEND** — for each candidate threat's ATT&CK techniques, note the countermeasure technique classes that counter them. This is forward-looking toward the Control Catalog and seeds the optional `D3FEND` mapping.

### 4b. Threat drafting

1. Identify risks that arise from this service's distinct behavior and are not already covered by an imported core threat.

2. For each capability in the Step 2 inventory, consider the failure modes feasible on that surface across AWS, Azure, and GCP, informed by the discovery sources above. Prefer granular, service-specific threats over broad umbrella statements when the behavior is meaningfully distinct (e.g., separate "Dead-Letter Queue Exposes Sensitive Payloads" from "Messages Replayed by Unauthorized Consumers").

3. Each proposed threat must:
   - Map to at least one capability from the Step 2 inventory.
   - Be realizable on all three CSPs (provider-neutral), even if the mechanism differs. Evidence from a single CSP advisory or a CVE in KEV satisfies the realizability check; generalize the underlying weakness to a provider-neutral statement.
   - Use a `group` id defined in `catalogs/core/core/groups.yaml` (e.g., `Encryption`, `Access`, `Observability`, `Data`, `Resource`).

4. Number threats sequentially: `CCC.<ABBREVIATION>.TH01`, `CCC.<ABBREVIATION>.TH02`, ...
   - If updating an existing `threats.yaml`, continue numbering after the highest existing id and do not renumber existing threats.

5. Follow `style-guides/catalogs/threat-style-guide.yaml` for titles and descriptions:
   - Titles: ≤12 words, title case, framed as a negative event or security failure (e.g., "Data is Exposed to Unauthorized Consumers").
   - Descriptions: multi-line `|` text with a three-part structure — **Circumstances** (conditions/mechanism), **Effect** (what happens to the system), **Impact** (effect on confidentiality, integrity, or availability).
   - Use present tense and passive voice when describing manifestation ("may be misconfigured", "could be exploited"). Avoid intent-based words (`accidental`, `malicious`, `deliberately`) and speculative hedging (`might possibly`). Focus on technical mechanisms, not attacker motivation.
   - Use the precise vocabulary from the style guide: `user`, `component`, `child resource`, `external system`.

6. Identify external framework mappings for each threat, observing the **mapping-reference gate** (a framework may get a mapping document only if its `reference-id` is declared in `metadata.mapping-references`). These feed the MappingDocuments written in Step 6:
   - **`MITRE-ATT&CK`** — technique IDs (`Txxxx` / `Txxxx.xxx`) from Step 4a. Prefer cloud-platform techniques and specific sub-techniques.
   - **`D3FEND`** — defensive technique IDs (`D3-XXX`) that counter the threat's ATT&CK techniques. Optional; the bridge to the Control Catalog. Omit when there is no ATT&CK anchor.
   - **`CISA-KEV`** — `CVE-YYYY-NNNNN` IDs, used only as illustrative exploitation evidence for a matching weakness class. `remarks` must state the affected product and `dateAdded` and note the CVE is illustrative. Use sparingly; never force a mapping.
   - **`CWE` / `OWASP-Top-10`** — as before.
   - **CSP advisories** — cite in threat `remarks` by default; create a `CSP-Advisory` mapping document only if `CSP-Advisory` is declared in `metadata.mapping-references`.
   - Skip a framework entirely when no confident mapping exists rather than guessing.

### Output Format

First output line must be: **Step 4: Service-Specific Threat Identification**

Return the proposed threats in a markdown table:

| Threat ID | Group | Title | Maps To Capabilities | ATT&CK | D3FEND | KEV / Other | Evidence (source) |
|---|---|---|---|---|---|---|---|
| `CCC.<ABBR>.TH01` | `group` | `title` | `CCC.<ABBR>.CP01` | T1020 | D3-OTF | CVE-2024-XXXXX, CWE-200 | GCP bulletin GCP-2024-NNN |

(Leave a cell blank where no confident mapping or evidence exists. Frameworks shown in ATT&CK/D3FEND/KEV columns that are *not* declared in `metadata.mapping-references` are discovery-only and must not get a mapping document in Step 6 — they remain in `remarks` instead.)

At the end of Step 4, return a single confirmation block in this format:

Service ID: `CCC.<ABBREVIATION>`
Imported core threats: `n`
Service-specific threats: `n`
Capabilities referenced: `n of total`
Mapping frameworks used: `e.g. MITRE-ATT&CK, D3FEND, CWE`
Discovery-only frameworks (not declared in metadata): `list, or none`
Recommended metadata.mapping-references additions: `list, or none`
Target files: <catalogs/.../.../threats.yaml> plus `mappings/threats-<framework>.yaml` per framework

Reply with one of the following:

CONFIRM
EDIT

Do not proceed to Step 5 until the user replies CONFIRM. If the user replies EDIT, apply the edits and return the updated Step 4 confirmation block, then wait for CONFIRM.

## Step 5: Create threats.yaml

1. Use `schemas/threats-schema.json` as the source of truth for required and allowed fields.

2. Build `imported-threats` from the confirmed Step 3 selection using the schema shape:

   ```yaml
   imports:
     - reference-id: CCC
       entries:
         - reference-id: CCC.Core.TH01
           remarks: <core threat title>
   ```

3. Build `threats` from the confirmed Step 4 list. Each threat must include `id`, `title`, `description`, and `group`:

   ```yaml
   threats:
     - id: CCC.<ABBREVIATION>.TH01
       group: <Group>
       title: <Threat Title>
       description: |
         <Circumstances — the conditions or mechanism>. <Effect — what
         happens to the system>. <Impact — effect on confidentiality,
         integrity, or availability>.
       capabilities:
         - reference-id: CCC
           entries:
             - reference-id: CCC.<ABBREVIATION>.CP01
               remarks: <capability title>
             - reference-id: CCC.Core.CP11
               remarks: <core capability title>
   ```

   Threats never carry an inline `external-mappings` field — external framework
   references belong in the Step 6 MappingDocuments.

4. Capability mapping rules:
   - Every threat must reference at least one capability from the Step 2 inventory.
   - `reference-id` capability IDs must match the pattern `CCC[.<service>].CP<n>` and exist in the service `capabilities.yaml` or core capabilities.
   - Include `remarks` with the capability title for readability.

5. Validate the final object against `schemas/threats-schema.json` before writing the file. Verify:
   - Every `group` id exists in `catalogs/core/core/groups.yaml`.
   - Every capability `reference-id` exists in the service `capabilities.yaml` or core capabilities.

6. Write the file to `<target-path>/threats.yaml`.

7. If a `threats.yaml` already exists, show a diff-style summary and ask for confirmation before overwrite.

### Output Format

First output line must be: **Step 5: Create threats.yaml**

Return the threats creation result in this format:

Threats File: <catalogs/.../.../threats.yaml>
Threats Status: `created|updated|pending-confirmation`
Imported Threats: `n` | Service-Specific Threats: `n`
Capabilities Referenced: `n of total`
Validation: `passed|failed`
Confidence: `High|Medium|Low`

## Step 6: Create Mapping Documents

External framework references are standalone Gemara MappingDocuments — one file
per target framework — in the service's `mappings/` directory. Use
`schemas/mappingdocument-schema.json` as the source of truth for required and
allowed fields, and an existing document (e.g.
`catalogs/storage/object/mappings/threats-mitre-attack.yaml`) as a reference.

1. For each framework confirmed in Step 4 (and passing the mapping-reference
   gate), create `<target-path>/mappings/threats-<framework-slug>.yaml` with a
   lowercase framework slug (e.g. `threats-mitre-attack.yaml`,
   `threats-d3fend.yaml`, `threats-cwe.yaml`):

   ```yaml
   title: <Service Title> Threats to <Framework>
   metadata:
     id: CCC.<ABBREVIATION>.TH.threats-to-<framework-slug>
     type: MappingDocument
     gemara-version: 1.2.0
     version: dev
     description: Maps <service> threats to <framework> entries they relate to.
     author:
       id: FINOS-CCC
       name: FINOS Common Cloud Controls
       type: Human
     mapping-references:
       - id: CCC.<ABBREVIATION>.TH
         title: <Service Title> Threats
         version: dev
       - id: <framework reference-id, e.g. MITRE-ATT&CK>
         title: <framework title>
         version: <framework version, or dev_to-be-determined>
         url: <framework canonical URL>
   source-reference:
     reference-id: CCC.<ABBREVIATION>.TH
     entry-type: Threat
   target-reference:
     reference-id: <framework reference-id>
     entry-type: <Vector for attack techniques; per WG convention otherwise>
   mappings:
     - id: CCC.<ABBREVIATION>.TH01-<framework-slug>
       source: CCC.<ABBREVIATION>.TH01
       relationship: relates-to
       targets:
         - entry-id: T1020
           remarks: <entry title, or evidence notes where the framework rules require them>
   ```

2. Mapping rules (carried over from Step 4):
   - One `mappings[]` entry per threat that maps to the framework; threats with
     no confident mapping simply do not appear.
   - `relationship` defaults to `relates-to` unless the working group has
     ratified a stronger relationship for the pair.
   - **`MITRE-ATT&CK`:** technique IDs from the cloud platforms; sub-techniques
     preferred over parents.
   - **`D3FEND`:** countermeasure IDs (`D3-XXX`) derived from the threat's
     ATT&CK techniques; `remarks` should note which technique each counters.
     Skip the document if no threat has an ATT&CK anchor.
   - **`CISA-KEV`:** CVE IDs as illustrative exploitation evidence only;
     `remarks` must include the affected product and `dateAdded` and flag the
     CVE as illustrative. Do not fabricate a CVE. The threat statement itself
     stays CVE-free — KEV lives only in the mapping document.
   - **CSP advisories:** record in the threat `remarks` by default; create a
     `CSP-Advisory` document only when that `reference-id` is declared in
     metadata.

3. Validate each document against `schemas/mappingdocument-schema.json` before
   writing. Verify every `source` threat id exists in the Step 5 `threats.yaml`
   and both `source-reference` and `target-reference` ids appear in the
   document's own `metadata.mapping-references`.

4. If a mapping document already exists for a framework, update it in place
   (continue `id` numbering from the threat ids; never renumber) and show a
   diff-style summary before overwrite.

### Output Format

First output line must be: **Step 6: Create Mapping Documents**

Return the mapping documents result in this format:

Mapping documents: `catalogs/.../.../mappings/threats-<slug>.yaml`, ...
Documents Status: `created|updated|pending-confirmation`
Mappings emitted: `MITRE-ATT&CK: n | D3FEND: n | CISA-KEV: n | CWE: n | ...`
Frameworks skipped (not in mapping-references): `list, or none`
Validation: `passed|failed`
Confidence: `High|Medium|Low`
