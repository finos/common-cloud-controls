# Release Assets

Each asset released by the CCC will include a set of capabilities, threats, and controls for a specific cloud service category.

For example, a [release] for Object Storage will contain [capabilities] that any compliant cloud service—such as AWS S3, Azure Blob Storage, or Google Cloud Storage—must include. The release will also contain [threats] associated with the common capabilities, informed by the MITRE ATT&CK framework. Finally, a set of [controls] will be provided, detailing the mitigation of these threats, along with mappings to external control frameworks like CCM, ISO 27001, and NIST 800-53.

When creating assets for a new service category, review the content standards for [capabilities], [threats], and [controls].

In addition to the three YAML files, each release must include a `metadata.yaml` file, which is described below.

## Release Metadata

Metadata adds critical information about the state and context of the release.

- **Category Title** (`title`): The title of the service category to which this release pertains.
- **Category Identifier** (`id`): A unique identifier that prefixes all IDs in the release (capabilities, threats, controls, etc.). It should use a category abbreviation (max 8 characters), formatted as `CCC.<Category Abbreviation>`.
- **Category Description** (`description`): A complete description of the service category, detailing its use case, scope, and relevance to cloud security and compliance.
- **[Assurance Level]** (`assurance_level`): Indicates the level of confidence in the security and reliability of the service. Values include:
  - `None`: Actively under development.
  - `AL0`: Only capabilities are complete at release time.
  - `AL1`: Capabilities, threats, and controls are complete at release time.
  - `AL2`: Threats are based on a threat model for this category.
  - `AL3`: Threats are based on a red team exercise for this category.

### Release Details

Each release will contain specific details about the current version, stakeholders, and relevant exercises:

- **Version** (`version`): The release version using the [CalVer](https://calver.org/) format (YYYY.MM). This versioning ensures that releases are traceable to specific points in time.
- **Threat Model URL** (`threat_model_url`): A stable URL to the threat model for the release. If no model exists, use `None`.
- **Threat Model Author** (`threat_model_author`): The organization or lead author responsible for the threat model that informs this release. If no model exists, use `None`.
- **Red Team Name** (`red_team`): The organization or team lead responsible for the red team exercise informing this release. If no exercise exists, use `None`.
- **Red Team Exercise URL** (`red_team_exercise_url`): A stable URL to the red team exercise assets for this release. If no exercise exists, use `None`.

### Release Manager

Information about the individual overseeing the release:

- **Name** (`name`): The name of the release manager.
- **GitHub ID** (`github_id`): The GitHub handle of the release manager for issue tracking, PR review, and contribution attribution.
- **Company** (`company`): The company or organization the release manager is associated with.
- **Summary** (`summary`): Summary of the release and the reason for the changes.

### Change Log

Document changes related to the release, providing details of all post-release updates:

- **Change Log** (`change_log`): List of changes, one entry per pull request (PR). This includes added capabilities, improvements, or updates after the initial release.

## Example Metadata

Below is an example of a fully populated metadata file for a release.

```yaml
title: Object Storage
id: CCC.OBJSTG
description: |
  Object Storage services allow the storage of unstructured data in scalable, high-availability, and high-durability systems. Examples include AWS S3, Azure Blob Storage, and Google Cloud Storage.
release-details:
  - version: 2024.09
    assurance_level: AL2
    threat_model_url: https://example.com/threat-model
    threat_model_author: SecurityTeam XYZ
    red_team: XYZ Red Team
    red_team_exercise_url: https://example.com/red-team-exercise
    release_manager:
      name: Damien Burks
      github_id: damienjburks
      company: Citi
      summary: This release is the first to include a red team exercise based on Object Storage.
    change_log:
      - "PR#25: Added mitigation for XYZ risk identified in red team exercise."
      - "PR#34: Updated controls for increased encryption requirements."
```

[release]: ../releases/README.md
[capabilities]: ./capability-definitions.md
[threats]: ./threat-definitions.md
[controls]: ./control-definitions.md
