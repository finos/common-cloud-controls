# Releases

This document is a [community guideline].

## Purpose

The document outlines the guidelines of managing releases within the Common Cloud Controls (CCC) project.

## Ownership

The [Communications WG] has overall ownership of releases. They are responsible for setting the roadmap and communicating project progress to the wider community. All other [WG]s should contribute to determining the content of a release.

## Scheduling

The community aims for several releases per year. Releases can occur as soon as the controls for a service are complete and approved. As the CCC project is producing a standard, releases should encapsulate a concrete set of stable, robustly tested changes constituting a new version of the project over small isolated changes and bugfixes.

### Events

The community can align releases with events such as the [Open Source in Finance Forum (OSFF)](https://events.linuxfoundation.org/open-source-finance-forum/). These events provide excellent opportunities to showcase the project and generating interest.

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

[WG]: ../community-groups.md#working-groups
[Communications WG]: ../working-groups/communications/charter.md
[community guideline]: ./README.md
[Milestones]: https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-milestones
