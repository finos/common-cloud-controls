# Release Assets

Each asset released by CCC will be a set of common features, threats, and controls for a category of cloud services.

For example: A single [release] for Object Storage will contain [features] that should be present on any cloud service that seeks to be compliant in this category— such as AWS S3, Azure Blob Storage, and Google Cloud Storage. That same release will contain [threats] that have been identified for the common features, informed by the MITRE ATT&CK framework. Finally, a set of [controls] will be included, which contain information about the mitigation of the common threats as well as mappings to other frequently used control frameworks such as CCM, ISO 27001, and NIST 800-53.

When creating assets for a new service category, be sure to review the content standards for the [features], [threats], and [controls].

In addition to these three YAML files, each release should contain a `metadata.yaml`, which is defined below.

## Release Metadata

Metadata information is included to add information about the state of the release.

- `title`
  - **Category Title**: The title of the service category this control belongs to.
- `id`
  - **Category Identifier**: The value that will prefix all other IDs in this release, including features, threats, controls, test requirements, and tests. It is should contain a category abbreviation that is a maximum of 8 characters long. The ID is formatted as `CCC.<Category Abbreviation>`
- `description`
  - **Category Description** - A 1 to 3 sentence description of the service category.
- `assurance_level`
  - **[Assurance Level]**: The degree of confidence that a cloud resource or service is secure, reliable, and capable of withstanding threats. This is to be referenced by a certification authority. Possible values are:
    - `None`: actively under development
    - `AL0 `: only features are complete at release time
    - `AL1 `: features, threats, and controls are complete at release time
    - `AL2 `: threats are written based on a threat model for this category
    - `AL3 `: threats are written based on a red team exercise for this category
- `threat_model_author`
  - **Threat Model Author**: The name of the organization, or the name of the lead author for the threat model that informs this release. If no threat model has been completed, this should be `None`.
- `threat_model_url`
  - **Threat Model URL**: Stable path to where the threat model for this release can be referenced. If no threat model has been completed, this should be `None`.
- `red_team`
  - **Red Team Name**: The name of the organization, or the name of the team lead for the red team exercize that informs this release. If no red team exercize has been completed, this should be `None`.
- `red_team_exercize_url`
  - `Red Team Exercize Assets URL`: Stable path to where the red team exercize assets for this release can be referenced. If no red team exercize has been completed, this should be `None`.

[release]: ../releases.md
[features]: ./feature-definitions.md
[threats]: ./threat-definitions.md
[controls]: ./control-definitions.md
[Assurance Level]: ./assurance-level-definitions.md
