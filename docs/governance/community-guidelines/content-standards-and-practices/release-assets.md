# Release Assets

Each asset released by the CCC will include a set of features, threats, and controls for a specific cloud service category.

For example, a [release] for Object Storage will contain [features] that any compliant cloud service—such as AWS S3, Azure Blob Storage, or Google Cloud Storage—must include. The release will also contain [threats] associated with the common features, informed by the MITRE ATT&CK framework. Finally, a set of [controls] will be provided, detailing the mitigation of these threats, along with mappings to external control frameworks like CCM, ISO 27001, and NIST 800-53.

When creating assets for a new service category, review the content standards for [features], [threats], and [controls].

In addition to the three YAML files, each release must include a `metadata.yaml` file, which is described below.

## Release Metadata

Metadata adds critical information about the state and context of the release.

- **Category Title** (`title`): The title of the service category to which this release pertains.
- **Category Identifier** (`id`): A unique identifier that prefixes all IDs in the release (features, threats, controls, etc.). It should use a category abbreviation (max 8 characters), formatted as `CCC.<Category Abbreviation>`.
- **Category Description** (`description`): A 1-3 sentence description of the service category.
- **Assurance Level** (`assurance_level`): Indicates the level of confidence in the security and reliability of the service. Values include:
  - `None`: Actively under development
  - `AL0`: Only features are complete at release time
  - `AL1`: Features, threats, and controls are complete at release time
  - `AL2`: Threats are based on a threat model for this category
  - `AL3`: Threats are based on a red team exercise for this category
- **Threat Model Author** (`threat_model_author`): The organization or lead author responsible for the threat model that informs this release. If no model exists, use `None`.
- **Threat Model URL** (`threat_model_url`): A stable URL to the threat model for the release. If no model exists, use `None`.
- **Red Team Name** (`red_team`): The organization or team lead responsible for the red team exercise informing this release. If no exercise exists, use `None`.
- **Red Team Exercise URL** (`red_team_exercise_url`): A stable URL to the red team exercise assets for this release. If no exercise exists, use `None`.

[release]: ../releases.md
[features]: ./feature-definitions.md
[threats]: ./threat-definitions.md
[controls]: ./control-definitions.md
[Assurance Level]: ./assurance-level-definitions.md
