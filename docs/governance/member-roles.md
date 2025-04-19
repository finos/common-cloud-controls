# Member Roles

Everyone is welcome to contribute through discussion, issues, and pull requests.

The following are roles and additional responsibilities that a person may recieve in the community.

| Role     | Responsibilities                                                                        | Requirements                                                                     | Defined by                                                           |
| -------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Member   | Active contributor in the community, assist on community calls, give input on proposals | Sponsored by 2 reviewers after multiple contributions to the project             | GitHub FINOS `ccc-members` Group Member                              |
| Approver | Review contributions from other members                                                 | History of quality reviews and authorship in a particular space                  | [CODEOWNERS] entry for specific files or directories                 |
| WG Lead  | Set direction and priorities for a working group (WG)                                   | Demonstrated responsibility and excellent technical judgement for the subproject | [CODEOWNERS] entry for all files or directories relating to the [WG] |

## All New & Established Contributors

Anyone attending a CCC meeting, event, or contributing in any way will be expected to follow the [Linux Foundation Code of Conduct].

New contributors should be welcomed to the community by existing members, helped with pull request (PR)
workflow, and directed to relevant documentation and communication channels.

Established community members of **all roles** are expected to demonstrate technical and/or writing ability in their contributions,
adherence to the principles of the project, and familiarity with project organization
(roles, policies, procedures, conventions, etc). Role-specific expectations, responsibilities,
and eligibility requirements are enumerated below.

## Member

Members are continuously active contributors within the community. They can have issues or PRs
assigned to them and assist or scribe on community calls.

**Defined by:** GitHub FINOS `ccc-members` Group Member

### Eligibility Requirements

- Enabled two-factor authentication on their GitHub account
- Actively contributing to 1 or more [WG] in the past three (3) months.
- Have made **multiple contributions** to the project or community, enough to
  demonstrate an **ongoing and long-term commitment** to the project.
- Subscribed to the [community mail group]
- Applied, sponsored, and approved for member status.
  1. Open an pull request against the CCC repo [`participants.md`](/participants.md):
  - The PR description should contain a list or summary of your work on the project to date.
  1. Sponsoring reviewers mark the PR as ready to merge:
  - Must be sponsored by 2 approvers from 2 employers.
  - Sponsors must have close project interactions with the prospective member
    (such as in PR review, proposal creation, coordinating on issues, etc.)
  1. Once your sponsors have approved, your request will be merged by the appropriate party within 14 days.

### Definition of Contributions

Contributions are meaningful engagements that advance the goals of the community.
These include, but are not limited to:

- Submission of impactful pull requests that are subsequently merged into the project's
  repositories.
- Additive participation in discussions on issues, pull requests, or community forums
  like mailing lists, Slack channels, or meetings.
- Contribution to design proposals or reviews.
- Assistance given in community management and organization, such as event planning or
  managing community tools and resources.

### Responsibilities and Privileges

- Responsive to issues and PRs assigned to them.
- Participate actively in at least one [WG].
- Scribe on community calls when necessary.
- Can have issues and PRs assigned to them.
- Can be invited to review and advise on PR approvals.
- Participation publicly documented in [`participants.md`](/participants.md).

## Approver

Approvers review contributions from members and have a history of quality reviews
and authorship in a specific domain.

Approvers are able to block or approve code contributions. Approval is focused on
holistic acceptance of a contribution including: backwards / forwards
compatibility, adhering to all conventions, subtle performance and
correctness issues, interactions with other parts of the system, and so forth.

**Defined by:** [CODEOWNERS] entry or GitHub Team for a specific scope.

### Requirements

- Active _Member_ of the project for at least 3 months.
- History of quality reviews and contributions within a specific scope.
- Appointed by a [WG] Lead.
  - Appointer may create a PR to add appointee to the [CODEOWNERS] file **OR** an issue requesting the appointee's addition to a GitHub Team for the appropriate scope.
    - The PR/issue must remain open for seven (7) days to gather feedback, or until
      all active approvers have responded, whichever is first.
    - Any current approver may request changes or reject the appointment.
      - Objections may be made for any reason, with or without public explanation.
      - Objection appeals to the Steering Committee may be made by the appointer.
    - **Note:** Adjustments to an approver's scope must follow this same process.

### Responsibilities and Privileges

- Provide thorough and practical reviews of contributions from other members.
- Ensure contributions meet the project's conventions and quality standards.
- May approve and merge PRs from other members, or block PRs with requests for changes.
- Adhere to the general responsibilities of a member.

## WG Lead

WG Leads set direction and priorities for a working group, demonstrating responsibility
and excellent technical judgement for the subproject.

**Defined by:** [CODEOWNERS] entry for all files or directories relating to the [WG] **and** GitHub Team for the respective working group.

### Requirements

- Demonstrated responsibility and excellent technical judgement for the [WG] topic as an
  _Approver_ for at least (3) months.
- Appointed by a [SC] vote.
  - A [SC] sponsor must create a PR to update [`participants.md`](/participants.md): with the new appointment.
  - Extending [CODEOWNERS] scope for an individual must follow the approver nomination process.
  - When appointment is confirmed, the sponsor must work with a repo admin to add appointee to the appropriate GitHub team(s)
- Adhere to relevant [community groups] guidelines, such as:
  - Follow the corresponding [WG] Charter
  - Ensure the proper execution of [WG] meetings
  - Represent the [WG] in relevant accountability meetings, or delegate an eligible representative

### Responsibilities and Privileges

- Set direction and priorities for a WG, ensuring consistent progress.
- Present the [WG] status and progress to the rest of the community.
- Adhere to the general responsibilities of an _Approver_.

## Inactive Members

A core principle in maintaining a healthy community is encouraging active
participation. It is inevitable that people's focuses will change over time and
they are not expected to be actively contributing forever.

Inactive members are those who carry an aforementioned role or title within CCC
with **zero** qualifying contributions in the preceding 6 months.

Inactive members will be removed from their roles and will need to re-engage with the
community and go through the aforementioned processes again to regain their status.

Specific group charters may specify a shorter period for their roles.

---

[Linux Foundation Code of Conduct]: https://events.linuxfoundation.org/about/code-of-conduct/
[CODEOWNERS]: /.github/CODEOWNERS
[community mail group]: mailto:ccc-participants+subscribe@finos.org
[community groups]: ../governance/community-structure.md
[SC]: ../governance/community-structure.md#steering-committee
[WG]: ../governance/community-structure.md#working-groups
