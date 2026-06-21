---
name: build-capability-catalog
description: Create a CCC capability catalog (metadata.yaml + capabilities.yaml) for a cloud service, mapping equivalent offerings across AWS, Azure, and GCP and placing them in the correct catalogs/ category folder. Use whenever the user asks to "create a capability catalog" / "capability catalog" for a cloud service, or "create a capability catalog for a service similar to <known service>".
---

# Capability Catalog Skill


## Purpose
Create a capability catalog for a cloud service, supporting the onboarding process for new cloud service capabilities.

## Final Outcome

`metadata.yaml` and `capabilities.yaml` files created for a new CCC service that maps to equivalent offerings across AWS, Azure, and GCP, with a new folder created in the correct category path in the repository.

## When to Use
When the user asks to create a capability catalog for a cloud service. For example, "Create a capability catalog for a service similar to <known_service_name>" or "Create a capability catalog".

## Step 1: Cross-Cloud Service Mapping
1. Request for the example service and the source cloud provider. 
  - If No example is given, ask for an example.
2. Try to identify the cloud service provider from the example.
  - If cloud service provider is not identifiable, ask for clarification. Options allowed are AWS, Azure, GCP.
3. Resolve equivalent or closest offerings for AWS, Azure, and GCP.
4. Prefer official documentation domains:
	- AWS: `docs.aws.amazon.com`
	- Azure: `learn.microsoft.com/azure`
	- GCP: `cloud.google.com`
5. If multiple mappings exist, choose the closest functional match and list alternates briefly.

### Output Format
First output line must be: **Step 1: Cross-Cloud Service Mapping**

Return only the cross-cloud mapping in a markdown table:

| Cloud | Service Name | Official Documentation |
|---|---|---|
| AWS | <service> | <url> |
| Azure | <service> | <url> |
| GCP | <service> | <url> |

Confidence: <High|Medium|Low>

## Step 2: Service Taxonomy Planning
1. Determine one provider-neutral common name that describes the three mapped offerings.
2. Propose one abbreviation with these rules:
	- Maximum length is 8 characters.
	- Use letters and numbers only.
	- Use ALL CAPS only.
	- Keep it recognizable and easy to read.
3. If the first abbreviation is ambiguous, propose one alternative.
4. Identify the appropriate category(s) for the service based on functionality and existing CCC categories in `catalogs/categories.yaml`. Determine one or more category ids (e.g., `CCC.Storage`).
5. Determine a folder name and full target path for the new service.
6. Validate the proposed category id(s) against `catalogs/categories.yaml`.
7. Determine the folder name and target path internally, but do not create the folder in this step.
8. Folder naming guidance:
	- Use lowercase kebab-case.
	- Keep names concise and descriptive.
	- Example: `object-storage`.
9. Example rule:
	- If category is `CCC.Storage`, create the service folder under `catalogs/storage/`.
  - If there is no folder for the category, create one with the category name in lowercase (e.g., `catalogs/storage/`).

### Output Format
First output line must be: **Step 2: Service Taxonomy Planning**

At the end of Step 2, return a single confirmation block in this format:

Common Name: <provider-neutral-name>
Abbreviation: <ALL-CAPS-max-8-char-abbreviation>
Folder name: <kebab-case-folder-name>
Target path: <catalogs/.../...>
Categories: <CCC.Category1, CCC.Category2, ...>

Reply with one of the following:
1. CONFIRM
2. EDIT

Do not proceed to Step 3 until the user replies CONFIRM. If the user replies EDIT, apply the edits and return the updated Step 2 confirmation block, then wait for CONFIRM.

## Step 3: Create Target Folder
1. Use the confirmed target path from Step 2.
2. Create the target folder when it does not already exist.
3. If the folder already exists, do not recreate it and continue.

### Output Format
First output line must be: **Step 3: Create Target Folder**

Return folder creation result in this format:

Target path: <catalogs/.../...>
Folder Status: <created|exists>
Confidence: <High|Medium|Low>

## Step 4: Create `metadata.yaml`
1. Use the confirmed values from Steps 1 to 3:
	- Confirmed cross-cloud mapping (AWS, Azure, GCP service names and links).
	- Confirmed common name.
	- Confirmed abbreviation.
	- Confirmed category id.
	- Confirmed target folder path.
2. Use `schemas/metadata-schema.json` as the source of truth for required and allowed metadata fields.
3. Build the metadata content from the confirmed inputs and the current schema:
	- Set `metadata.id` as `CCC.<ABBREVIATION>` where abbreviation is ALL CAPS, at most 8 characters, and uses only letters and numbers.
	- Set `metadata.title` to `CCC <Common Name>`.
	- Generate `metadata.description` as a concise provider-neutral summary of the service type.
	- Set `metadata.category-ids` to include the confirmed category id.
	- Populate `metadata.example-csp-services` with exactly AWS, Azure, and GCP entries from confirmed mapping.
	- Include any schema-required companion fields such as `version`, `last-modified`, `applicability-categories`, and `mapping-references` when they are defined in the schema.
4. Validate the final object against `schemas/metadata-schema.json` before writing the file.
5. Write the file to `<confirmed-target-path>/metadata.yaml`.
6. If a `metadata.yaml` already exists, show a diff-style summary and ask for confirmation before overwrite.

### Output Format
First output line must be: **Step 4: Create `metadata.yaml`**

Return the metadata creation result in this format:

Metadata File: <catalogs/.../.../metadata.yaml>
Metadata Status: <created|updated|pending-confirmation>
Validation: <passed|failed>
Confidence: <High|Medium|Low>

## Step 5: Create `capabilities.yaml`
1. Create a `capabilities.yaml` file in the same target folder path as `metadata.yaml`.
2. Use `schemas/capabilities-schema.json` as the source of truth for required and allowed fields.
3. Review the official documentation links from Step 1 and identify the shared capabilities or features across AWS, Azure, and GCP.
4. Prefer granular, service-specific capabilities over broad umbrella statements when the service behavior is meaningfully distinct.
5. Decompose the service into the smallest useful capability units that still remain provider-neutral. For example, separate key-based access, secondary indexes, transactional writes, conditional updates, backup/restore, streams, capacity modes, replication, and change notification when the service supports them.
	- Include only capabilities that are genuinely shared across all three mapped providers (AWS, Azure, and GCP). Verify each candidate against every provider's official documentation before including it.
	- Exclude features that exist on only one provider, and exclude capabilities that belong to a different service category. For example, do not add relational SQL engine options (MySQL, PostgreSQL) to a NoSQL catalog, because the example NoSQL service cannot provide them.
	- Express each capability in terms of the provider-neutral behavior, not a single provider's product feature name.
6. Look at the imported core capabilities in `catalogs/core/ccc/capabilities.yaml` and select any matching shared capabilities that should be reused.
7. Do not duplicate capabilities already covered by `imported-capabilities` as service-specific entries in `capabilities`.
	- If a capability is imported from core, keep it in `imported-capabilities` only.
	- If a capability is already represented by a core capability such as `CCC.Core.CP11` or `CCC.Core.CP12`, do not create a second service-specific capability with the same intent.
8. Add matching core capabilities under `imported-capabilities` using the schema shape:

```yaml
imported-capabilities:
	- reference-id: CCC
		entries:
			- reference-id: <core-capability-id>
				remarks: <core-capability-title>
```

9. Add service-specific capabilities under `capabilities` using the schema and style guide only for capabilities that are not already covered by imported core capabilities:

```yaml
capabilities:
	- id: CCC.<ABBREVIATION>.CP01
		group: <Group>
		title: <Capability Title>
		description: |
			<Provider-neutral capability description>
```

10. Follow `style-guides/catalogs/capability-style-guide.yaml` when writing titles and descriptions.
	- Write each `description` as 1 to 3 explanatory lines, not a single terse fragment. State what the capability does and how or why it is used, while remaining provider-neutral.
	- Start every description with "The service" and include a temporal term: "always" or "automatically" for behavior present by default, and "can" or "may be configured" for optional or configurable behavior.
	- Keep each `title` short and in title case (10 words or fewer); put the detail in the description, not the title.
11. Validate the final object against `schemas/capabilities-schema.json` before writing the file.
12. Write the file to `<confirmed-target-path>/capabilities.yaml`.
13. If a `capabilities.yaml` already exists, replace it with the validated content and record the update status.

### Output Format
First output line must be: **Step 5: Create `capabilities.yaml`**

Return the capabilities creation result in this format:

Capabilities File: <catalogs/.../.../capabilities.yaml>
Capabilities Status: <created|updated|pending-confirmation>
Validation: <passed|failed>
Confidence: <High|Medium|Low>

