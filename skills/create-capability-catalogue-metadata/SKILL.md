---
name: create-capability-catalogue-metadata
description: Create metadata.yaml and folder structure for a new CCC capability catalogue. Used by Coding Agent and GitHub Actions draft-catalogue-metadata workflow.
---

# Capability Catalogue — Metadata Phase

## Purpose

Draft cross-cloud mapping, taxonomy, target folder, and `metadata.yaml` for a new CCC service. Does **not** create `capabilities.yaml` (see `skills/create-capability-catalogue-capabilities/SKILL.md`).

## Final Outcome

Target folder and `metadata.yaml` under the correct category path.

## GitHub Actions mode

Invoked from `.github/workflows/draft-catalogue-metadata.yml`:
- `example_service` and `source_cloud` are supplied in the prompt wrapper 

## Coding Agent mode (e.g Cursor)

- You will need to ask the user for the `example_service` and `source_cloud` parameters.

## Step 1: Cross-Cloud Service Mapping

1. Use the supplied example service and source cloud provider.
2. Resolve equivalent or closest offerings for AWS, Azure, and GCP.
3. Prefer official documentation domains:
   - AWS: `docs.aws.amazon.com`
   - Azure: `learn.microsoft.com/azure`
   - GCP: `cloud.google.com`
4. If multiple mappings exist, choose the closest functional match.

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

## Step 3: Create Target Folder

1. Use the path from Step 2.
2. Create the target folder when it does not already exist.
3. If the folder already exists, do not recreate it and continue.

## Step 4: Create `metadata.yaml`

1. Use values from Steps 1 to 3:
   - Cross-cloud mapping (AWS, Azure, GCP service names and links).
   - Common name, abbreviation, category ids, target folder path.
2. Use `schemas/metadata-schema.json` as the source of truth.
3. Build metadata:
   - `metadata.id` as `CCC.<Abbreviation>` (letters and numbers, max 16 chars after `CCC.` per schema).
   - `metadata.title` as `CCC <Common Name>`.
   - Concise provider-neutral `metadata.description`.
   - `metadata.category-ids` from confirmed categories.
   - `metadata.example-csp-services` with exactly AWS, Azure, and GCP entries from the mapping from step 1.
   - Include schema-required fields: `version`, `last-modified`, `applicability-categories`, `mapping-references` when required.
4. Validate against `schemas/metadata-schema.json` before finishing.
5. Write to `<target-path>/metadata.yaml`.
