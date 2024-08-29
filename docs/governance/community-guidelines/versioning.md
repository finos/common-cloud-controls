# Versioning Guidelines

This document is a [community guideline].

## Purpose

This document outlines the versioning standards and practices to be followed within the Common Cloud Controls (CCC) project.

## Ownership

The [Delivery WG] is entrusted with the overall responsibility for managing version control across all artifacts within this project. This includes defining versioning standards, ensuring consistent application of those standards across various deliverables, and maintaining the integrity of version history. The [Delivery WG] collaborates closely with other [WG]s to ensure that all artifacts are versioned appropriately and in alignment with the project's release and update schedules that is set by the [Communications WG].

## CalVer Standard

The CalVer Standard (Calendar Versioning) is a method of version control that utilizes the calendar date to label releases. This approach provides clear, time-based context to the version numbers, making it easier to understand when a particular version was released. For example, a version like `Object Storage 24.07` indicates that the release occurred in July 2024.

## Artifact-Specific Versioning

Versioning will be scoped to each artifact delivered by the working groups. This means each artifact may have its own unique version number, reflecting its specific timeline and updates. The following items or artifacts are in-scope for versioning:

- Threat Catalogs
- Controls Catalogs
- Taxonomy Documents
- Feature files (Gherkin acceptance test cases)

## Release Frequency

Releases should happen, at most, one time per month. This schedule ensures a manageable release cadence and maintains the stability of our artifacts. For more information about the releases, please refer to this document: [Releases](./releases.md)

[WG]: ../community-groups.md#working-groups
[Communications WG]: ../working-groups/communications/charter.md
[Delivery WG]: ../working-groups/delivery/charter.md
[community guideline]: ./README.md
