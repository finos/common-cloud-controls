# Releases

This document is a [community guideline].

## Purpose

The document outlines the guidelines of managing releases within the Common Cloud Controls (CCC) project.

## Ownership

The [Communications WG] has overall ownership of releases. They are responsible for setting the roadmap and communicating project progress to the wider community. All other [WG]s should contribute to determining the content of a release.

## Scheduling

The community aims for several releases per year. Releases can occur as soon as the controls for a service are complete and approved. As the CCC project is producing a standard, releases should encapsulate a concrete set of stable, robustly tested changes constituting a new version of the project over small isolated changes and bugfixes.

### Events

The community can align releases with events such as the [Open Source in Finance Forum (OSFF)](https://events.linuxfoundation.org/open-source-finance-forum/). These events provide excellent opportunities to showcase the project and generate interest.

## Project Board Management

To manage GitHub issues targeted for a release, we recommend using a combination of [Milestones] and labels.

### Milestones

[Milestones] group GitHub issues related to a specific release. Each release should have a single top-level milestone associated with all relevant issues.

There are two types of releases:

1. Service Releases: Controls for individual services can be released independently.
2. Service Sets: When appropriate, the controls of multiple services can be grouped together and released as a bundle.

### Labels

Each [WG] should apply their label to relevant issues, clearly indicating which issues fall under their responsibility.

Additionally, labels can flag issues specifically targeted for events (e.g., OSFF events).

## Release Process

### Pull Request Validation

1. **Submission:** A contributor raises a Pull Request (PR) against the CCC repository, proposing changes to the catalogs and `metadata.yaml`. All applicable details should be added within the `release_details` object, including the name of the release manager who will oversee the next steps upon merge.
2. **Working Group Review:**
   - The [Security WG] reviews the PR to ensure that all the required fields have been populated correctly and the controls and threat catalogs are ready for release.
   - The [Taxonomy WG] reviews the PR to ensure that all the required fields have been populated correctly and the features are ready for release.
3. **Validation:** Both WGs must validate and approve the PR before it can be merged into the main branch.

### Release Candidate Preparation

1. **Creation of a Release Candidate (RC):** Once the PR is merged, a release candidate is created by the release manager. The release manager will trigger the `release` GitHub action and populate the required fields, such as build target(s).
2. **Documentation Polish:** The [Delivery WG] will make final changes to the release documentation before moving to the next phase.
3. **Stakeholder Review:** Stakeholders, including key contributors and external partners, review the RC to ensure it meets the project’s quality and compliance standards.
4. **Final Approvals:** The RC undergoes final approval by the [Communications WG] and the core maintainers before proceeding to the final release.

### Final Release

1. **Publishing:** Once all validations and reviews are complete, the release candidate will be promoted to an official release. The final release is published on the GitHub Releases page, along with comprehensive release notes and documentation updates.
2. **Announcement:** The [Communications WG] will announce the official release to the community via mailing lists, social media, and relevant events, ensuring all stakeholders are informed.

[WG]: ../community-groups.md#working-groups
[Security WG]: ../working-groups/security/charter.md
[Taxonomy WG]: ../working-groups/taxonomy/charter.md
[Communications WG]: ../working-groups/communications/charter.md
[community guideline]: ./README.md
[Milestones]: https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-milestones
