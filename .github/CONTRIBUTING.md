# Community Specification Contribution Policy 1.0

This document provides the contribution policy for specifications and other documents developed using the Community Specification process in a repository (each a “Working Group”). Additional or alternate contribution policies may be adopted and documented by the Working Group.

## Project Roles and the Technical Steering Committee

The Common Cloud Controls project is governed by its Technical Steering Committee (TSC), whose operation is described in the [TSC governance process]. This section documents the project roles, the Technical Steering Committee, and the Maintainers. Everyone is welcome to contribute through discussion, issues, and pull requests.

The TSC may adopt or modify roles, so long as the roles are documented in this file. Unless otherwise documented, the base roles are **Contributor** and **Maintainer**.

| Role                               | Responsibilities                                                                   | Requirements                                                  | Defined by                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| Technical Steering Committee (TSC) | Govern the project: technical oversight, strategic direction, roadmap, and process | Appointed via the [TSC governance process]                   | [TSC governance process]                                             |
| WG Lead                            | Set direction and priorities for a working group (WG)                              | Demonstrated responsibility and excellent technical judgement | [CODEOWNERS] entry for all files or directories relating to the [WG] |
| Maintainer                         | Review and merge contributions, and help maintain project assets and tooling       | Promoted from Contributor by a majority approval of the TSC  | [CODEOWNERS] entry for specific files or directories                 |
| Contributor                        | Contribute code, documentation, or other technical artifacts to the project        | Open to anyone                                               | Community participation                                              |

Anyone attending a CCC meeting, event, or contributing in any way is expected to follow the [Linux Foundation Code of Conduct]. Established community members of **all roles** are expected to demonstrate technical and/or writing ability in their contributions, adherence to the principles of the project, and familiarity with project organization (roles, policies, procedures, conventions, etc).

### Technical Steering Committee

The Technical Steering Committee (TSC) is the project's governing body, responsible for technical oversight, strategic direction, the roadmap, and governance. How the TSC makes decisions, and how members join and leave it, is set out in the [TSC governance process]. Membership of the TSC is determined by that process, with members serving in their own right rather than by virtue of holding any other role; this is the alternative approach to determining the committee's voting members that the TSC has adopted under section 2 of the [Technical Charter].

The current members of the TSC are (affiliations shown for reference only):

- Mohamed Alsaloom — Citi
- Michael Lysaght — Citi
- Dean Bryen — LSEG
- Leroy Abhikui — LSEG
- Dave Reeve — Morgan Stanley
- Stevie Shiells — Scott Logic
- Sonali Mendis — Scott Logic
- Aric Rosenbaum — Red Hat
- Jenn Power — Red Hat
- Ernani Cecon — RBC
- Maxime Coquerel — RBC
- Sankara Ramakrishnan — BlackRock

The current FINOS point of contact for the project is @robmoffat (see [finos-poc.md](/docs/governance/finos-poc.md)).

### WG Lead

WG Leads set direction and priorities for a working group, demonstrating responsibility and excellent technical judgement for the subproject.

**Defined by:** [CODEOWNERS] entry for all files or directories relating to the [WG] **and** GitHub Team for the respective working group.

**Requirements:**

- Demonstrated responsibility and excellent technical judgement for the [WG] topic as a _Maintainer_ for at least three (3) months.
- Appointed by a TSC vote. A TSC member must create a PR to update [`participants.yaml`](/participants.yaml) with the new appointment. Extending [CODEOWNERS] scope for an individual must follow the Maintainer promotion process. When appointment is confirmed, work with a repo admin to add the appointee to the appropriate GitHub team(s).
- Adhere to relevant [community groups] guidelines, such as following the corresponding [WG] Charter, ensuring the proper execution of [WG] meetings, and representing the [WG] in relevant accountability meetings (or delegating an eligible representative).

**Responsibilities and privileges:**

- Set direction and priorities for a WG, ensuring consistent progress, and feed into project [roadmap] planning.
- Review and approve pull requests within the WG's scope.
- Own the WG's contribution to releases and the release process.
- Steward the WG's community assets and tooling.
- Present the [WG] status and progress to the rest of the community.
- Adhere to the general responsibilities of a _Maintainer_.

### Maintainer

Maintainers are Contributors who have earned the ability to commit (merge) changes to the project's repositories. In addition to reviewing pull requests, they help maintain the project's community assets and tooling within their scope.

Approval of a contribution is focused on holistic acceptance, including backwards / forwards compatibility, adhering to all conventions, subtle performance and correctness issues, interactions with other parts of the system, and so forth.

**Defined by:** [CODEOWNERS] entry or GitHub Team for a specific scope.

**Becoming a Maintainer.** A Contributor becomes a Maintainer by a **majority approval of the TSC**. Once approved, the Maintainer is added to the [CODEOWNERS] file (or the appropriate GitHub Team) for their scope. A Maintainer may be removed by a **majority approval of the TSC**.

**Responsibilities and privileges:**

- Provide thorough and practical reviews of contributions from other members.
- May approve and merge PRs from other members, or block PRs with requests for changes.
- Help maintain the project's community assets — repositories, documentation, and related resources — within their scope.
- Maintain project tooling and build/test infrastructure within their scope.
- Ensure contributions meet the project's conventions and quality standards.

The current Maintainers are:

<!-- Add maintainers here -->

### Contributor

A Contributor is anyone in the technical community who contributes code, documentation, or other technical artifacts to the project. Contributing is open to anyone who abides by the project's policies and the [Linux Foundation Code of Conduct]; no prior appointment is required. New contributors should be welcomed to the community, helped with the pull request (PR) workflow, and directed to relevant documentation and communication channels.

**Definition of contributions.** Contributions are meaningful engagements that advance the goals of the community. These include, but are not limited to:

- Submission of impactful pull requests that are subsequently merged into the project's repositories.
- Additive participation in discussions on issues, pull requests, or community forums like mailing lists, Slack channels, or meetings.
- Contribution to design proposals or reviews.
- Assistance given in community management and organization, such as event planning or managing community tools and resources.

### Inactive Members

A core principle in maintaining a healthy community is encouraging active participation. It is inevitable that people's focuses will change over time, and they are not expected to be actively contributing forever.

Inactive members are those who carry a role or title within CCC with **zero** qualifying contributions in the preceding 6 months. Inactive members will be removed from their roles and will need to re-engage with the community and go through the processes above again to regain their status. Specific group charters may specify a shorter period for their roles.

## 1. Contribution Guidelines.

This Working Group accepts contributions via pull requests. The following section outlines the process for merging contributions to the specification

**1.1. Issues.** Issues are used as the primary method for tracking anything to do with this specification Working Group.

**1.1.1. Issue Types.** There are three types of issues (each with their own corresponding label):

**1.1.1.1. Discussion.** These are support or functionality inquiries that we want to have a record of for future reference. Depending on the discussion, these can turn into "Spec Change" issues.

**1.1.1.2. Proposal.** Used for items that propose a new ideas or functionality that require a larger discussion. This allows for feedback from others before a specification change is actually written. All issues that are proposals should both have a label and an issue title of "Proposal: [the rest of the title]." A proposal can become a "Spec Change" and does not require a milestone.

**1.1.1.3. Spec Change:** These track specific spec changes and ideas until they are complete. They can evolve from "Proposal" and "Discussion" items, or can be submitted individually depending on the size. Each spec change should be placed into a milestone.

## 2. Issue Lifecycle.

The issue lifecycle is mainly driven by the Maintainer. All issue types follow the same general lifecycle. Differences are noted below.

**2.1. Issue Creation.**

**2.2. Triage.**

o The Editor in charge of triaging will apply the proper labels for the issue. This includes labels for priority, type, and metadata.

o (If needed) Clean up the title to succinctly and clearly state the issue. Also ensure that proposals are prefaced with "Proposal".

**2.3. Discussion.**

o "Spec Change" issues should be connected to the pull request that resolves it.

o Whoever is working on a "Spec Change" issue should either assign the issue to themselves or make a comment in the issue saying that they are taking it.

o "Proposal" and "Discussion" issues should stay open until resolved.

**2.4. Issue Closure.**

## 3. How to Contribute a Patch.

The Working Group uses pull requests to track changes. To submit a change to the specification:

**3.1 Fork the Repo, modify the Specification to Address the Issue.**

**3.2. Submit a Pull Request.**

## 4. Pull Request Workflow.

The next section contains more information on the workflow followed for Pull Requests.

**4.1. Pull Request Creation.**

o We welcome pull requests that are currently in progress. They are a great way to keep track of important work that is in-flight, but useful for others to see. If a pull request is a work in progress, it should be prefaced with "WIP: [title]". You should also add the wip label Once the pull request is ready for review, remove "WIP" from the title and label.

o It is preferred, but not required, to have a pull request tied to a specific issue. There can be circumstances where if it is a quick fix then an issue might be overkill. The details provided in the pull request description would suffice in this case.

**4.2. Triage**

o The Editor in charge of triaging will apply the proper labels for the issue. This should include at least a size label, a milestone, and awaiting review once all labels are applied.

**4.3. Reviewing/Discussion.**

o All reviews will be completed using the review tool.

o A "Comment" review should be used when there are questions about the spec that should be answered, but that don't involve spec changes. This type of review does not count as approval.

o A "Changes Requested" review indicates that changes to the spec need to be made before they will be merged.

o Reviewers should update labels as needed (such as needs rebase).

o When a review is approved, the reviewer should add LGTM as a comment.

o Final approval is required by a designated Editor. Merging is blocked without this final approval. Editors will factor reviews from all other reviewers into their approval process.

**4.4. Responsive.** Pull request owner should try to be responsive to comments by answering questions or changing text. Once all comments have been addressed, the pull request is ready to be merged.

**4.5. Merge or Close.**

o A pull request should stay open until a Maintainer has marked the pull request as approved.

o Pull requests can be closed by the author without merging.

o Pull requests may be closed by a Maintainer if the decision is made that it is not going to be merged.

[Linux Foundation Code of Conduct]: https://events.linuxfoundation.org/about/code-of-conduct/
[CODEOWNERS]: /.github/CODEOWNERS
[community groups]: /docs/governance/community-structure.md
[roadmap]: /docs/governance/steering/process.md#roadmap-planning
[WG]: /docs/governance/community-structure.md#working-groups
[TSC governance process]: /docs/governance/steering/process.md
[Technical Charter]: /docs/governance/charter.md
