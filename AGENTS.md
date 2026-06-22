# Agent Instructions

Guidance for AI coding assistants working in this repository. This file is plain
repo content so any agent (Claude Code, Cursor, Copilot, etc.) can read it.

## Skills

Reusable, step-by-step procedures live in [`skills/`](skills/). **Before starting a
task, check whether a skill in that directory already covers it, and if so follow
the skill exactly** — including any per-step output formats and confirmation gates.

| Skill | Use when |
|---|---|
| [`skills/build-capability-catalog/SKILL.md`](skills/build-capability-catalog/SKILL.md) | The user asks to create a capability catalog for a cloud service (e.g. "create a capability catalog for a service similar to Amazon DynamoDB"). Produces `metadata.yaml` + `capabilities.yaml`. |
| [`skills/build-threat-catalog/SKILL.md`](skills/build-threat-catalog/SKILL.md) | The user asks to identify or create threats for a service ("create a threat catalog", "create threats.yaml"). Produces `threats.yaml` mapped to capabilities and external frameworks (MITRE ATT&CK/D3FEND, CISA KEV, CWE, OWASP). Requires existing `metadata.yaml` + `capabilities.yaml`. |
| [`skills/build-control-catalog/SKILL.md`](skills/build-control-catalog/SKILL.md) | The user asks to identify or create controls for a service ("create a control catalog", "create controls.yaml"). Produces `controls.yaml` with service-specific controls mapped to threats plus testable assessment requirements. |
| [`skills/build-service-behavioural-test-analysis/SKILL.md`](skills/build-service-behavioural-test-analysis/SKILL.md) | Planning behavioural test coverage for a service's `controls.yaml`. Produces `analysis.md` and a minimal `cloud-api` interface sketch. Explicit invocation only (`disable-model-invocation`). |
| [`skills/build-features-and-cloud-api/SKILL.md`](skills/build-features-and-cloud-api/SKILL.md) | Implementing an **approved** `analysis.md` into runnable behavioural tests (Gherkin features, `cloud-api` Go package, terraform fixtures, Privateer config). Runs after `build-service-behavioural-test-analysis`. Explicit invocation only (`disable-model-invocation`). |

The typical onboarding flow for a new service runs these in order: capability →
threat → control → behavioural-test-analysis → features-and-cloud-api.

> Note: Claude Code also discovers each skill via a pointer at
> `.claude/skills/<skill-name>/SKILL.md`, which defers to the canonical file in
> `skills/`. The `skills/` directory remains the single source of truth — keep
> skill content there, and add a matching `.claude/skills/` pointer for any new
> skill.

## Catalog conventions

Catalogs live under [`catalogs/`](catalogs/), grouped by category. A service
catalog is a folder containing `metadata.yaml`, `capabilities.yaml`, and (where
applicable) `threats.yaml` / `controls.yaml`.

- Validate `metadata.yaml` against [`schemas/metadata-schema.json`](schemas/metadata-schema.json)
  and `capabilities.yaml` against [`schemas/capabilities-schema.json`](schemas/capabilities-schema.json).
- Follow [`style-guides/catalogs/capability-style-guide.yaml`](style-guides/catalogs/capability-style-guide.yaml)
  when writing capabilities: descriptions start with "The service", use a temporal
  term ("always"/"automatically" for default behavior, "can"/"may be configured"
  for optional), and run 1–3 explanatory lines rather than terse fragments.
- Include only capabilities genuinely shared across all mapped providers
  (AWS, Azure, GCP); do not include single-provider or other-category features.
- Reuse shared core capabilities from
  [`catalogs/core/ccc/capabilities.yaml`](catalogs/core/ccc/capabilities.yaml) via
  `imported-capabilities` instead of duplicating them as service-specific entries.
