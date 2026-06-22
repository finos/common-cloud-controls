# Threat Catalogue Skill

## Purpose
Identify and create security threats for a cloud service, supporting the onboarding process for new cloud service threats in the CCC repository. This is the bridge between capabilities and controls: capabilities define what the service can do, threats define what can go wrong, and controls mitigate the threats.

## Final Outcome

A `threats.yaml` file created in the service folder that imports applicable core threats from `catalogs/core/ccc/threats.yaml`, defines service-specific threats mapped to the service's capabilities, grounds each threat in current adversary and exploitation evidence, and maps it to external frameworks — adversary techniques (MITRE ATT&CK), defensive countermeasures (MITRE D3FEND), known exploited vulnerabilities (CISA KEV), and weakness taxonomies (CWE, OWASP) — validated against `schemas/threats-schema.json`.

## When to Use
When the user asks to identify or create threats for a cloud service. For example, "Identify threats for <service>", "Create a threat catalogue for <service>", or "Create threats.yaml for the service in <path>".

## Prerequisites
The target service folder must already contain:
- `metadata.yaml` (provides the service abbreviation, CSP service links, and `mapping-references`)
- `capabilities.yaml` (provides the capability surface threats are mapped against)

If either file is missing, stop and instruct the user to run the Capability Catalogue skill first, since every threat must map to at least one capability.

## Reference Sources

These four sources feed threat work along two distinct axes. **Discovery** sources inform *what* threats exist and *whether they are realistic*; they are consulted during Step 3/4 reasoning and need not appear in the YAML. **Mapping** sources become `external-mappings` entries in the YAML and are gated by `metadata.mapping-references` (see the gate rule below).

| Source | `reference-id` | Role | Entry ID format | Canonical source |
|---|---|---|---|---|
| MITRE ATT&CK (Enterprise — cloud platforms: IaaS, SaaS, Identity Provider, Office Suite) | `MITRE-ATT&CK` | Discovery + Mapping | `Txxxx`, `Txxxx.xxx` | attack.mitre.org |
| MITRE D3FEND (v1.x knowledge graph of countermeasures) | `D3FEND` | Mapping (threat → countermeasure bridge to controls) | `D3-XXX` (e.g. `D3-NTA`) | d3fend.mitre.org |
| CISA Known Exploited Vulnerabilities Catalog | `CISA-KEV` | Discovery + Mapping (sparingly, as exploitation evidence) | `CVE-YYYY-NNNNN` | cisa.gov/known-exploited-vulnerabilities-catalog; JSON feed at `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` (GitHub mirror: `cisagov/kev-data`) |
| CSP Security Advisories (AWS / Azure / GCP) | remarks-level by default, or `CSP-Advisory` if declared | Discovery + Evidence | provider-specific (`AWS-YYYY-NNN`, MSRC `ADV`/`CVE`, `GCP-YYYY-NNN`) | AWS: aws.amazon.com/security/security-bulletins · Azure: msrc.microsoft.com + service bulletins on learn.microsoft.com · GCP: cloud.google.com/support/bulletins |
| CWE / OWASP Top 10 (unchanged) | `CWE`, `OWASP-Top-10` | Mapping | `CWE-nnn`, `Axx:YYYY` | cwe.mitre.org · owasp.org |

**Source-role notes — read before mapping:**

- **MITRE ATT&CK** is the primary discovery lens for adversary behaviour. Prefer techniques drawn from the Enterprise cloud platforms over generic endpoint techniques, and prefer a specific sub-technique (`Txxxx.xxx`) over its parent when one applies.
- **MITRE D3FEND** describes *countermeasures*, not threats, so it is the forward-link to the Control Catalogue rather than a description of the risk itself. Derive D3FEND techniques from a threat's ATT&CK mapping (D3FEND maps countermeasures to the ATT&CK techniques they counter via the Digital Artifact Ontology) and record them as "the defensive technique classes that address this threat." Treat D3FEND mappings as optional; omit when no ATT&CK anchor exists.
- **CISA KEV** is product- and CVE-specific, whereas CCC threats are provider-neutral and capability-based. Use KEV mainly to confirm *realizability* (Step 4) — if a weakness class in this service category appears in KEV, the threat is demonstrably live. Emit a `CISA-KEV` external mapping only when a threat corresponds directly to a class of weakness with KEV entries, cite one or two representative CVE IDs, and make the `remarks` state that the CVE is illustrative evidence (with the affected product and `dateAdded`). Never invent a 1:1 threat→CVE mapping to fill the block.
- **CSP Security Advisories** are not a stable framework with durable mapping IDs. By default they are a discovery and grounding source: use them in Step 4 to find documented, real-world failure modes for each capability across AWS, Azure, and GCP, and cite the relevant advisory in a threat's `remarks`. Only emit a structured `CSP-Advisory` external mapping if the team has explicitly declared `CSP-Advisory` in `metadata.mapping-references`.

**Mapping-reference gate.** A framework may appear in `external-mappings` only if its `reference-id` is declared in `metadata.mapping-references`. If `MITRE-ATT&CK`, `D3FEND`, or `CISA-KEV` is not yet declared:
1. Still use it for discovery and realizability reasoning, and for `remarks`.
2. Do not emit it as an `external-mappings` block.
3. Surface a recommendation in the Step 4 confirmation block to add the missing `reference-id`(s) to `metadata.mapping-references` (this is the metadata/Capability Catalogue skill's responsibility, not this skill's — do not edit `metadata.yaml` here).

## Step 1: Locate Service and Validate Prerequisites
1. Request the target service folder path (e.g., `catalogs/storage/object/`).
   - If no path is given, ask for the service name and resolve the folder under `catalogs/`.
   - If the folder cannot be resolved, list candidate folders and ask for clarification.
2. Verify the prerequisite files exist in the folder.
3. Read `metadata.yaml` and extract:
   - The service abbreviation from `metadata.id` (e.g., `ObjStor` from `CCC.ObjStor`).
   - The `example-csp-services` entries (AWS, Azure, GCP names and documentation links).
   - The `mapping-references` list — only these may be used as `external-mappings` `reference-id` values later.
4. Check whether a `threats.yaml` already exists in the folder and note it.
5. Compare the declared `mapping-references` against the Reference Sources table. Note which of `MITRE-ATT&CK`, `D3FEND`, and `CISA-KEV` are declared (usable as mappings) versus undeclared (discovery-only, per the mapping-reference gate).

### Output Format
First output line must be: **Step 1: Locate Service and Validate Prerequisites**

Return the validation result in this format:

Target path: <catalogs/.../...>
Service ID: CCC.<ABBREVIATION>
Prerequisites: <metadata.yaml: found|missing> | <capabilities.yaml: found|missing>
Existing threats.yaml: <yes|no>
Mapping references (declared): <MITRE-ATT&CK, D3FEND, CISA-KEV, CWE, ...>
Mapping sources usable: <list declared> | Discovery-only (undeclared): <list undeclared>
Confidence: <High|Medium|Low>

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
| CCC.Core.CP11 | <title> | imported | <group> |
| CCC.<ABBR>.CP01 | <title> | service-specific | <group> |

Total capabilities forming the attack surface: <n>
Confidence: <High|Medium|Low>

## Step 3: Core Threat Reuse
1. Read `catalogs/core/ccc/threats.yaml` and review all core threats (`CCC.Core.TH*`).
2. Select core threats for import when the threat applies to one or more of the service's capabilities (e.g., import `CCC.Core.TH02` "Data is Intercepted in Transit" only if the service transmits data over the network).
3. Do not plan service-specific threats that duplicate the intent of an imported core threat. If a core threat such as `CCC.Core.TH01` (Access Control is Misconfigured) already covers the risk generically, keep it in `imported-threats` only and reserve service-specific threats for risks unique to this service's behavior.
4. Compare against a peer catalog in the same category (e.g., `catalogs/storage/object/threats.yaml` for a storage service) as a sanity check on which core threats are conventionally imported.

### Output Format
First output line must be: **Step 3: Core Threat Reuse**

Return the selected imports in a markdown table:

| Core Threat ID | Title | Applies To Capability |
|---|---|---|
| CCC.Core.TH02 | <title> | CCC.<ABBR>.CP03 |

Confidence: <High|Medium|Low>

## Step 4: Service-Specific Threat Identification

### 4a. Source-driven discovery
Before drafting threats, work each capability from the Step 2 inventory against the discovery sources in the Reference Sources table. This grounds the catalogue in real adversary behaviour and demonstrated exploitation rather than speculation:

1. **MITRE ATT&CK** — for each capability, identify the adversary techniques feasible on that surface, drawing from the Enterprise cloud platforms (IaaS, SaaS, Identity Provider, Office Suite). These technique IDs seed both the threat statement and its `MITRE-ATT&CK` mapping.
2. **CISA KEV** — check whether weaknesses in this service category (or its common implementation patterns) appear in the KEV catalog. A KEV hit is strong evidence that the threat is realizable in the wild and should raise the threat's priority; record representative CVE IDs and their `dateAdded` for use in `remarks` or, where the gate allows, a sparing `CISA-KEV` mapping.
3. **CSP Security Advisories** — review the AWS, Azure, and GCP security bulletins for the services behind each capability (see Reference Sources for URLs) to surface documented, provider-side failure modes. Use these to make threats concrete and provider-neutral (a real issue on one CSP usually points to an analogous risk on the others). Cite the advisory in the threat's `remarks`.
4. **MITRE D3FEND** — for each candidate threat's ATT&CK techniques, note the countermeasure technique classes that counter them. This is forward-looking toward the Control Catalogue and seeds the optional `D3FEND` mapping.

### 4b. Threat drafting
1. Identify risks that arise from this service's distinct behavior and are not already covered by an imported core threat.
2. For each capability in the Step 2 inventory, consider the failure modes feasible on that surface across AWS, Azure, and GCP, informed by the discovery sources above. Prefer granular, service-specific threats over broad umbrella statements when the behavior is meaningfully distinct (e.g., separate "Dead-Letter Queue Exposes Sensitive Payloads" from "Messages Replayed by Unauthorized Consumers").
3. Each proposed threat must:
   - Map to at least one capability from the Step 2 inventory.
   - Be realizable on all three CSPs (provider-neutral), even if the mechanism differs. Evidence from a single CSP advisory or a CVE in KEV satisfies the realizability check; generalize the underlying weakness to a provider-neutral statement.
   - Use a `group` id defined in `catalogs/core/ccc/groups.yaml` (e.g., `Encryption`, `Access`, `Observability`, `Data`, `Resource`).
4. Number threats sequentially: `CCC.<ABBREVIATION>.TH01`, `CCC.<ABBREVIATION>.TH02`, ...
   - If updating an existing `threats.yaml`, continue numbering after the highest existing id and do not renumber existing threats.
5. Follow `style-guides/catalogs/threat-style-guide.yaml` for titles and descriptions:
   - Titles: ≤12 words, title case, framed as a negative event or security failure (e.g., "Data is Exposed to Unauthorized Consumers").
   - Descriptions: multi-line `|` text with a three-part structure — **Circumstances** (conditions/mechanism), **Effect** (what happens to the system), **Impact** (effect on confidentiality, integrity, or availability).
   - Use present tense and passive voice when describing manifestation ("may be misconfigured", "could be exploited"). Avoid intent-based words (`accidental`, `malicious`, `deliberately`) and speculative hedging (`might possibly`). Focus on technical mechanisms, not attacker motivation.
   - Use the precise vocabulary from the style guide: `user`, `component`, `child resource`, `external system`.
6. Identify external framework mappings for each threat, observing the **mapping-reference gate** (a framework may be emitted only if its `reference-id` is declared in `metadata.mapping-references`):
   - **`MITRE-ATT&CK`** — technique IDs (`Txxxx` / `Txxxx.xxx`) from Step 4a. Prefer cloud-platform techniques and specific sub-techniques.
   - **`D3FEND`** — defensive technique IDs (`D3-XXX`) that counter the threat's ATT&CK techniques. Optional; the bridge to the Control Catalogue. Omit when there is no ATT&CK anchor.
   - **`CISA-KEV`** — `CVE-YYYY-NNNNN` IDs, used only as illustrative exploitation evidence for a matching weakness class. `remarks` must state the affected product and `dateAdded` and note the CVE is illustrative. Use sparingly; never force a mapping.
   - **`CWE` / `OWASP-Top-10`** — as before.
   - **CSP advisories** — cite in `remarks` by default; emit a structured `CSP-Advisory` mapping only if `CSP-Advisory` is declared in `metadata.mapping-references`.
   - Omit any `external-mappings` block entirely when no confident mapping exists rather than guessing.

### Output Format
First output line must be: **Step 4: Service-Specific Threat Identification**

Return the proposed threats in a markdown table:

| Threat ID | Group | Title | Maps To Capabilities | ATT&CK | D3FEND | KEV / Other | Evidence (source) |
|---|---|---|---|---|---|---|---|
| CCC.<ABBR>.TH01 | <group> | <title> | CCC.<ABBR>.CP01 | T1020 | D3-OTF | CVE-2024-XXXXX, CWE-200 | GCP bulletin GCP-2024-NNN |

(Leave a cell blank where no confident mapping or evidence exists. Frameworks shown in ATT&CK/D3FEND/KEV columns that are *not* declared in `metadata.mapping-references` are discovery-only and must not be emitted in Step 5 — they remain in `remarks` instead.)

At the end of Step 4, return a single confirmation block in this format:

Service ID: CCC.<ABBREVIATION>
Imported core threats: <n>
Service-specific threats: <n>
Capabilities referenced: <n of total>
Mapping frameworks used: <e.g. MITRE-ATT&CK, D3FEND, CWE>
Discovery-only frameworks (not declared in metadata): <list, or none>
Recommended metadata.mapping-references additions: <list, or none>
Target file: <catalogs/.../.../threats.yaml>

Reply with one of the following:

CONFIRM
EDIT

Do not proceed to Step 5 until the user replies CONFIRM. If the user replies EDIT, apply the edits and return the updated Step 4 confirmation block, then wait for CONFIRM.

## Step 5: Create threats.yaml
1. Use `schemas/threats-schema.json` as the source of truth for required and allowed fields.
2. Build `imported-threats` from the confirmed Step 3 selection using the schema shape:
   ```yaml
   imported-threats:
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
       external-mappings:
         - reference-id: MITRE-ATT&CK
           entries:
             - reference-id: T1020
               remarks: <technique title>
         - reference-id: D3FEND
           entries:
             - reference-id: D3-OTF
               remarks: <countermeasure title — counters T1020>
         - reference-id: CISA-KEV
           entries:
             - reference-id: CVE-2024-XXXXX
               remarks: <product> — added <dateAdded>; illustrative exploitation evidence for this weakness class
   ```
4. Capability mapping rules:
   - Every threat must reference at least one capability from the Step 2 inventory.
   - `reference-id` capability IDs must match the pattern `CCC[.<service>].CP<n>` and exist in the service `capabilities.yaml` or core capabilities.
   - Include `remarks` with the capability title for readability.
5. External mapping rules:
   - **Gate:** only emit `reference-id` framework values that are declared in `metadata.mapping-references`. Any framework used for discovery but not declared stays out of the YAML (carry it in `remarks` if it adds context).
   - Group entries by framework; include `remarks` with the entry title where it aids readability.
   - **`MITRE-ATT&CK`:** technique IDs from the cloud platforms; sub-techniques preferred over parents.
   - **`D3FEND`:** countermeasure IDs (`D3-XXX`) derived from the threat's ATT&CK techniques; `remarks` should note which technique each counters. Omit the block if the threat has no ATT&CK anchor.
   - **`CISA-KEV`:** CVE IDs as illustrative exploitation evidence only; `remarks` must include the affected product and `dateAdded` and flag the CVE as illustrative. Do not fabricate a CVE to populate the block. Because CCC threats are provider-neutral, the threat statement itself must remain CVE-free — KEV lives only in the mapping/remarks.
   - **CSP advisories:** record in the threat `remarks` by default (e.g., "documented in GCP bulletin GCP-2024-NNN"); emit a `CSP-Advisory` block only when that `reference-id` is declared in metadata.
   - Omit the `external-mappings` block entirely when no confident, in-gate mapping exists rather than guessing.
6. Validate the final object against `schemas/threats-schema.json` before writing the file. Verify:
   - Every `group` id exists in `catalogs/core/ccc/groups.yaml`.
   - Every capability `reference-id` exists in the service `capabilities.yaml` or core capabilities.
   - Every `external-mappings` `reference-id` framework is declared in `metadata.mapping-references` (drop any that are not, rather than failing the write).
7. Write the file to `<target-path>/threats.yaml`.
8. If a `threats.yaml` already exists, show a diff-style summary and ask for confirmation before overwrite.

### Output Format
First output line must be: **Step 5: Create threats.yaml**

Return the threats creation result in this format:

Threats File: <catalogs/.../.../threats.yaml>
Threats Status: <created|updated|pending-confirmation>
Imported Threats: <n> | Service-Specific Threats: <n>
Capabilities Referenced: <n of total>
External mappings emitted: <MITRE-ATT&CK: n | D3FEND: n | CISA-KEV: n | CWE: n | ...>
Mappings dropped (not in mapping-references): <list, or none>
Validation: <passed|failed>
Confidence: <High|Medium|Low>