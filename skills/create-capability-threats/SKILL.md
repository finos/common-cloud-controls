# Threat Catalogue Skill

## Purpose
Identify and create security threats for a cloud service, supporting the onboarding process for new cloud service threats in the CCC repository. This is the bridge between capabilities and controls: capabilities define what the service can do, threats define what can go wrong, and controls mitigate the threats.

## Final Outcome

A `threats.yaml` file created in the service folder that imports applicable core threats from `catalogs/core/ccc/threats.yaml`, defines service-specific threats mapped to the service's capabilities and to external frameworks (MITRE ATT&CK, CWE, OWASP), and validates against `schemas/threats-schema.json`.

## When to Use
When the user asks to identify or create threats for a cloud service. For example, "Identify threats for <service>", "Create a threat catalogue for <service>", or "Create threats.yaml for the service in <path>".

## Prerequisites
The target service folder must already contain:
- `metadata.yaml` (provides the service abbreviation, CSP service links, and `mapping-references`)
- `capabilities.yaml` (provides the capability surface threats are mapped against)

If either file is missing, stop and instruct the user to run the Capability Catalogue skill first, since every threat must map to at least one capability.

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

### Output Format
First output line must be: **Step 1: Locate Service and Validate Prerequisites**

Return the validation result in this format:

Target path: <catalogs/.../...>
Service ID: CCC.<ABBREVIATION>
Prerequisites: <metadata.yaml: found|missing> | <capabilities.yaml: found|missing>
Existing threats.yaml: <yes|no>
Mapping references: <MITRE-ATT&CK, CWE, ...>
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
1. Identify risks that arise from this service's distinct behavior and are not already covered by an imported core threat.
2. For each capability in the Step 2 inventory, consider the failure modes feasible on that surface across AWS, Azure, and GCP. Prefer granular, service-specific threats over broad umbrella statements when the behavior is meaningfully distinct (e.g., separate "Dead-Letter Queue Exposes Sensitive Payloads" from "Messages Replayed by Unauthorized Consumers").
3. Each proposed threat must:
   - Map to at least one capability from the Step 2 inventory.
   - Be realizable on all three CSPs (provider-neutral), even if the mechanism differs.
   - Use a `group` id defined in `catalogs/core/ccc/groups.yaml` (e.g., `Encryption`, `Access`, `Observability`, `Data`, `Resource`).
4. Number threats sequentially: `CCC.<ABBREVIATION>.TH01`, `CCC.<ABBREVIATION>.TH02`, ...
   - If updating an existing `threats.yaml`, continue numbering after the highest existing id and do not renumber existing threats.
5. Follow `style-guides/catalogs/threat-style-guide.yaml` for titles and descriptions:
   - Titles: ≤12 words, title case, framed as a negative event or security failure (e.g., "Data is Exposed to Unauthorized Consumers").
   - Descriptions: multi-line `|` text with a three-part structure — **Circumstances** (conditions/mechanism), **Effect** (what happens to the system), **Impact** (effect on confidentiality, integrity, or availability).
   - Use present tense and passive voice when describing manifestation ("may be misconfigured", "could be exploited"). Avoid intent-based words (`accidental`, `malicious`, `deliberately`) and speculative hedging (`might possibly`). Focus on technical mechanisms, not attacker motivation.
   - Use the precise vocabulary from the style guide: `user`, `component`, `child resource`, `external system`.
6. Identify external framework mappings for each threat using only frameworks declared in `metadata.mapping-references` (commonly `MITRE-ATT&CK` technique IDs, `CWE`, `OWASP-Top-10`).

### Output Format
First output line must be: **Step 4: Service-Specific Threat Identification**

Return the proposed threats in a markdown table:

| Threat ID | Group | Title | Maps To Capabilities | External Mappings |
|---|---|---|---|---|
| CCC.<ABBR>.TH01 | <group> | <title> | CCC.<ABBR>.CP01 | T1020, CWE-200 |

At the end of Step 4, return a single confirmation block in this format:

Service ID: CCC.<ABBREVIATION>
Imported core threats: <n>
Service-specific threats: <n>
Capabilities referenced: <n of total>
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
   ```
4. Capability mapping rules:
   - Every threat must reference at least one capability from the Step 2 inventory.
   - `reference-id` capability IDs must match the pattern `CCC[.<service>].CP<n>` and exist in the service `capabilities.yaml` or core capabilities.
   - Include `remarks` with the capability title for readability.
5. External mapping rules:
   - Only use `reference-id` framework values defined in `metadata.mapping-references`.
   - Group entries by framework; include `remarks` with the entry title where it aids readability.
   - Omit the `external-mappings` block entirely when no confident mapping exists rather than guessing.
6. Validate the final object against `schemas/threats-schema.json` before writing the file. Verify every `group` id exists in `catalogs/core/ccc/groups.yaml` and every capability `reference-id` exists in the service `capabilities.yaml` or core capabilities.
7. Write the file to `<target-path>/threats.yaml`.
8. If a `threats.yaml` already exists, show a diff-style summary and ask for confirmation before overwrite.

### Output Format
First output line must be: **Step 5: Create threats.yaml**

Return the threats creation result in this format:

Threats File: <catalogs/.../.../threats.yaml>
Threats Status: <created|updated|pending-confirmation>
Imported Threats: <n> | Service-Specific Threats: <n>
Capabilities Referenced: <n of total>
Validation: <passed|failed>
Confidence: <High|Medium|Low>
