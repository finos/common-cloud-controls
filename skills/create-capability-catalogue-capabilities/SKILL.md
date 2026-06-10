---
name: create-capability-catalogue-capabilities
description: Create capabilities.yaml for a CCC catalogue from confirmed metadata.yaml (Step 5). Used by Cursor and GitHub Actions add-catalogue-capabilities workflow.
---

# Capability Catalogue — Capabilities Phase

## Purpose

Create `capabilities.yaml` for a catalogue folder that already has a reviewed `metadata.yaml`. Does **not** modify metadata.

## Final Outcome

`capabilities.yaml` in the same folder as `metadata.yaml`, validating against `schemas/capabilities-schema.json`.

## GitHub Actions mode

When invoked from `.github/workflows/add-catalogue-capabilities.yml`:

- `catalog_path` and the PR-branch `metadata.yaml` are supplied in the prompt — do not ask for them.
- Do **not** modify `metadata.yaml`.
- Return **raw YAML only** for `capabilities.yaml` (no markdown fences, no commentary). File must validate against `schemas/capabilities-schema.json`.

Companion files appended below this skill: PR-branch `metadata.yaml`, `schemas/capabilities-schema.json`, `style-guides/catalogs/capability-style-guide.yaml`, core capability id+title index, and an example `capabilities.yaml`.

## Step 5: Create `capabilities.yaml`

1. Create `capabilities.yaml` in the same folder as `metadata.yaml`.
2. Use `schemas/capabilities-schema.json` as the source of truth.
3. Review official documentation links from `metadata.example-csp-services` and identify shared capabilities across AWS, Azure, and GCP.
4. Prefer granular, service-specific capabilities over broad umbrella statements when behaviour is meaningfully distinct.
5. Decompose into the smallest useful provider-neutral capability units.
6. Look at imported core capabilities in `catalogs/core/ccc/capabilities.yaml` and select matching shared capabilities to reuse.
7. Do not duplicate capabilities already covered by `imported-capabilities` as service-specific entries.
   - If imported from core, keep in `imported-capabilities` only.
   - Do not recreate intent already covered by core capabilities such as `CCC.Core.CP11` or `CCC.Core.CP12`.
8. Add matching core capabilities under `imported-capabilities`:

```yaml
imported-capabilities:
  - reference-id: CCC
    entries:
      - reference-id: <core-capability-id>
        remarks: <core-capability-title>
```

9. Add service-specific capabilities under `capabilities` only when not covered by imports:

```yaml
capabilities:
  - id: CCC.<ABBREVIATION>.CP01
    group: <Group>
    title: <Capability Title>
    description: |
      <Provider-neutral capability description>
```

Use the abbreviation from `metadata.id` (strip `CCC.` prefix) for capability ids.

10. Follow `style-guides/catalogs/capability-style-guide.yaml` for titles and descriptions.
11. Validate against `schemas/capabilities-schema.json` before finishing.
12. Write to `<catalog-path>/capabilities.yaml`.

### Output Format (interactive / Cursor)

First output line must be: **Step 5: Create `capabilities.yaml`**

Capabilities File: <catalogs/.../.../capabilities.yaml>
Capabilities Status: <created|updated>
Validation: <passed|failed>
Confidence: <High|Medium|Low>
