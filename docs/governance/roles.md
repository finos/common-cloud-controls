# Community membership

Everyone is welcome to contribute through discussion, issues, and pull requests. The following are roles and additional responsibilities that a person may be given in the community.

| Role | Responsibilities | Requirements | Defined by |
| -----| ---------------- | ------------ | -------|
| Member | Active contributor in the community, assist on community calls, give input on proposals | Sponsored by 2 reviewers after multiple contributions to the project | GitHub FINOS `ccc-members` Group Member |
| Approver | Review contributions from other members | History of quality reviews and authorship in a particular space | [CODEOWNERS] entry for specific files or directories |
| WG Lead | Set direction and priorities for a working group (WG) | Demonstrated responsibility and excellent technical judgement for the subproject | [CODEOWNERS] entry for all files or directories relating to the WG |
| SIG Lead | Set direction and priorities for a Special Interest Group (SIG) | Demonstrated responsibility and excellent technical judgement on the central SIG topic | Video conference and mailing list admin permissions |

## New & Established Contributors

New contributors should be welcomed to the community by existing members, helped with pull request (PR) 
workflow, and directed to relevant documentation and communication channels.

Established community members of all roles are expected to demonstrate technical and/or writing ability,
their adherence to the principles of the project, and familiarity with project organization 
(roles, policies, procedures, conventions, etc). Role-specific expectations, responsibilities,
and requirements are enumerated below.

Anyone attending a CCC meeting, event, or contributing in any way will be expected to follow the [Linux Foundation Code of Conduct].

## Member

Members are continuously active contributors within the community. They can have issues and PRs
assigned to them, participate in Special Interest Groups (SIGs) and Working Groups (WGs), and
assist or scribe on community calls.

**Defined by:** GitHub FINOS `ccc-members` Group Member

### Requirements

- Enabled [two-factor authentication] on their GitHub account
- Actively contributing to 1 or more subgroups in the past three (3) months.
- Have made **multiple contributions** to the project or community, enough to
  demonstrate an **ongoing and long-term commitment** to the project.
- Subscribed to [ccc-participants@finos.org]
- Applied, sponsored, and approved for member status.
  1. [Open an issue][membership template] against the CCC repo
    - Ensure your sponsors are @mentioned on the issue
    - Complete every item on the checklist 
      ([preview the current version of the template][membership template])
    - Make sure that the list of contributions included is representative of your work on the project.
  2. Have your sponsoring reviewers reply confirmation of sponsorship: `+1`
    - Sponsored by 2 approvers from 2 employers.
    - Sponsors must have close project interactions with the prospective member
      (such as in PR review, proposal creation, coordinating on issues, etc.)
  3. Once your sponsors have responded, your request will be reviewed by the [Steering Committee]
    within 30 days.

### Contributions Definition

Contributions are meaningful engagements that advance the goals of the community. 
These include, but are not limited to:

- Submittion of impactful pull requests that are subsequently merged into the project's
 repositories.
- Additive participation in discussions on issues, pull requests, or community forums
  like mailing lists, Slack channels, or meetings.
- Contribution to design proposals or reviews.
- Assistance given in community management and organization, such as event planning or
  managing community tools and resources.

### Responsibilities and Privileges

- Responsive to issues and PRs assigned to them.
- Participate actively in SIGs and WGs.
- Scribe on community calls when necessary.
- Can have issues and PRs assigned to them.
- Can be invited to review and advise on PR approvals.
- Username may be publicly documented in `participants.md`

## Approver

Approvers review contributions from members and have a history of quality reviews
and authorship in a specific domain.

Approvers are able to block or approve code contributions.  Approval is focused on
holistic acceptance of a contribution including: backwards / forwards
compatibility, adhering to all conventions, subtle performance and
correctness issues, interactions with other parts of the system, and so forth.

**Defined by:** `[CODEOWNERS]` entry for specific files or directories.

### Requirements

- Active _Member_ of the project for at least 3 months.
- History of quality reviews and contributions within a specific scope.
- Appointed by a SIG Lead or WG Lead.
  - Appointer must create a PR to add appointee to the `CODEOWNERS` file for the 
    appropriate scope.
    - The PR must remain open for seven (7) days to gather feedback, or until
      all active approvers have responded, whichever is first.
    - Any current approver may request changes or reject the appointment.
      - Objections may be made for any reason, with or without public explanation.
      - Objection appeals to the Steering Committee may be made by the nominator.
    - **Note:** Adjustments to an approver's scope must follow this same process.

### Responsibilities and Privileges

- Provide thorough and practical reviews of contributions from other members.
- Ensure contributions meet the project's conventions and quality standards.
- May approve and merge PRs from other members, or block PRs with requests for changes.
- Adhere to the general responsibilities of a member.

## WG Lead

WG Leads set direction and priorities for a working group, demonstrating responsibility
and excellent technical judgement for the subproject.

**Defined by:** `[CODEOWNERS]` entry for all files or directories relating to the WG.

### Requirements

- Demonstrated responsibility and excellent technical judgement for the WG topic as an
  _Approver_ for at least (3) months, or participated in the parent SIG for the same amount of time.
- Appointed by a SIG Lead.
  - Appointer must create a PR to update the `README.md` file with the new appointment.
  - If this requires changing approver scope, must follow the approver nomination process.
- Adhere to relevant [community groups] guidelines, such as:
  - Follow the corresponding WG Charter
  - Ensure the proper execution of WG meetings
  - Represent the WG in relevant SIG meetings, or delegate a representative

### Responsibilities and Privileges

- Set direction and priorities for a WG, ensuring consistent progress.
- Present the WG status and progress to the rest of the SIG.
- Adhere to the general responsibilities of an _Approver_.

## SIG Lead

SIG Leads set direction and priorities for a SIG, demonstrating responsibility and excellent 
technical judgement on the central SIG topic.

**Defined by:** Video conferencing and SIG mailing list permissions.

### Requirements

- Demonstrated responsibility and excellent technical judgement on the SIG topic as an _Approver_
  for at least (3) months.
- Appointed by a majority vote of the Steering Committee.
  - Steering Committee must create and merge a PR to update the `README.md` file.
  - If this requires changing approver scope, must follow the approver nomination process.

### Responsibilities and Privileges

- Set direction and priorities for the SIG.
- Adhere to relevant [community groups] guidelines, such as:
  - Maintain the SIG charter
  - Ensure proper execution of SIG meetings
  - Represent the SIG in public Steering Committee meetings, or delegate a representative
- Adhere to the general responsibilities of an _Approver_.

### Members

A core principle in maintaining a healthy community is encouraging active
participation. It is inevitable that people's focuses will change over time and
they are not expected to be actively contributing forever.

Inactive members will be removed from their roles and will need to re-engage with the 
community and go through the aforementioned processes again to regain their status.

### Inactivity Qualification

Inactive members are those who carry an aforementioned role or title within CCC 
with **zero** qualifying contributions in the preceding 6 months.

Specific group charters may specify a shorter period for their roles.

## Attribution

This document was adapted from the documentation for Kubernetes Community Membership [[519169d](upstream)].

---

[Linux Foundation Code of Conduct]: <https://events.linuxfoundation.org/about/code-of-conduct/>
[upstream]: https://github.com/kubernetes/community/blob/519169d/community-membership.md
[CODEOWNERS]: <https://github.com/finos/common-cloud-controls/blob/main/CODEOWNERS>
[ccc-participants@finos.org]: <TODO: how do people subscribe to this?>
[membership template]: <.github/ISSUE_TEMPLATE/membership.md>
[Steering Committee]: <./steering/charter.md>
[community groups]: <./community-groups.md>