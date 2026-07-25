# Why external mappings moved to standalone Mapping Documents

Until mid-2026, each threat in a catalog carried an inline `external-mappings`
list pointing at entries in external frameworks (MITRE ATT&CK, CWE, OWASP,
CCM, …). That field is gone: external references now live in standalone
[Gemara](https://github.com/gemaraproj/gemara) **MappingDocument** artifacts
under each service's `mappings/` directory, one file per target framework:

```text
catalogs/storage/object/
├── metadata.yaml
├── capabilities.yaml
├── threats.yaml                      # no external-mappings field
├── controls.yaml
└── mappings/
    └── threats-mitre-attack.yaml     # MappingDocument: threats → ATT&CK
```

## Why

1. **The schema no longer allows it.** Catalogs compile to Gemara v1.2.0 typed
   artifacts (`ThreatCatalog`, `ControlCatalog`, …), and those schemas have no
   inline external-mappings field. Keeping the old field meant every catalog
   failed CI validation.

2. **Higher-fidelity references.** The inline form could only say "TH01 relates
   to T1020 somehow". A MappingDocument states the source and target catalogs
   (with versions and URLs), the entry types on both ends, and a per-mapping
   `relationship` (e.g. `relates-to`), with room for the working group to ratify
   stronger semantics over time.

3. **Mappings can evolve without re-releasing a catalog.** External frameworks
   revise on their own schedule. When ATT&CK renumbers a technique, we update or
   re-release the mapping document alone; the threat catalog release it maps
   stays untouched. Inline mappings forced a full catalog release for every
   framework correction.

## What consumes them

- **The delivery toolkit** compiles `mappings/*.yaml` alongside the typed
  catalogs (`compile --type mappings`), restamping the spec and release
  versions.
- **The website** joins mapping documents back onto threats at build time, so
  threat pages still show an External Mappings table and catalog listings still
  show per-threat mapping counts.
- **Publication** of mapping documents to grc.store and GitHub releases is not
  wired up yet; released catalog versions will show their mappings once it is.

## Authoring

See `style-guides/catalogs/threat-style-guide.yaml` for conventions. In short:
name the file `threats-<framework>.yaml`, point `source-reference` at the
service's threats catalog, point `target-reference` at the framework, and give
each mapping a `source` threat id, a `relationship`, and a list of `targets`.
Never author inline `external-mappings` in catalog YAML.
