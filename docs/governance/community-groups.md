rules for creating community groups

# Common Cloud Controls (CCC) Community Structure

The CCC community is organized into a structure that enables contributors from diverse backgrounds to collaborate on developing the Common Cloud Controls standards. This structure ensures efficient governance, clear guidance for contributors, and effective management of the project's technical and non-technical aspects.

_**At a glance:** Non-technical leadership is centralized in the Steering Committee, while technical leadership is topically distributed among Special Interest Groups who may self-organize into autonomous Working Groups and User Groups as needed._

## Steering Committee

The **Steering Committee (SC)** is the ultimate governance body of the CCC project, responsible for
strategic oversight, financial planning, defining the project's values, high-level decision-making, and
coordination with the FINOS TOC or Board. It also handles the overall project structure and delegation of
responsibilities to various groups.

## Special Interest Groups

A **Special Interest Group (SIG)** is a long-running community group focused on particular aspects of the
CCC project. It will work on defining and maintaining a specific part of the standard, handling specific
topics such as security, cloud provider interactions, and compliance processes.

All [SIGs] must hold a public meeting no less than once every three (3) weeks, excluding November and
December. Agendas and attendance to public [SIG] meetings must be tracked in GitHub Issues.

The creation or decomission of a [SIG] may only be done through a supermajority vote of the [SC] (in accordance with the [Steering Committee Charter]).

### Formation

The formation of a [SIG] should follow these steps.

1. Propose the formation of a new [SIG] using the [proposal template], completing all necessary fields.
1. Work with the [SC] to schedule a proposal presentation.
1. The [SC] will vote on the proposal within two (2) weeks of presentation.
1. If approved, the [SC] will appoint a [SIG] Lead. If the proposer included a volunteer to lead the [SIG], a vote should be called to consider the volunteer. Otherwise, a volunteer should be found and confirmed prior to the [SIG] formation.
1. The [SIG] Lead should work closely with the SC to draft a charter for the [SIG]. The charter for the [WG] must be contributed through a pull request to a new directory within `docs/governance/special-interest-groups`.
1. When it is complete, the [SIG] Lead should work with the [SC] to schedule a charter presentation.
1. The [SC] will vote on the proposed charter within one (1) week of presentation. If not approved, the [SIG] Lead should incorporate any feedback and schedule a new charter presentation.
1. Upon acceptance of the charter, the [SC] must coordinate with FINOS and the [SIG] Lead to add a recurring public meeting to the community calendar.

### Accountability

[SIG] Leads or their delegates must present verbal OR written updates to the [SC] at its regular public meetings.

[SIG] Leads or their delegates must present an annual status report to the [SC] at the [SC]'s discretion.

### Horizontal [SIGs]

Horizontal [SIGs] in the CCC project address broad areas that cut across multiple aspects of cloud controls and standards. They aim to develop and support cross-cutting initiatives that ensure consistency and interoperability among different cloud environments and services. These [SIGs] bring together expertise from various vertical domains to solve common problems and establish best practices for the wider cloud community.

### Vertical [SIGs]

Vertical [SIGs] within the CCC project concentrate on specific segments of the cloud ecosystem, developing controls and standards tailored to particular use cases, technologies, or industry sectors. They delve into the unique challenges and requirements of these focused areas to provide more specialized guidance and standards.

## Working Groups (WGs)

**Working Groups (WGs)** are temporary entities formed to address specific problems or projects within the CCC framework. They cross-collaborate with [SIGs] and focus on achieving their goals before disbanding.

The creation or decomission of a [WG] is subject to the consensus of a [SIG], as outlined in the respective [SIG] charter and as defined in the goals of the [WG] stated in the [WG] charter.

### Formation

The formation of a [WG] should follow these steps.

1. Propose the formation of a new [WG] using the [proposal template], completing all necessary fields.
1. Work with the topically relevant [SIG] to schedule a proposal presentation.
1. The [SIG] must resolve any [WG] proposals in a timely manner to limit the number of outstanding 
   issues against the CCC project.
1. If approved, the [SIG] will appoint a [WG] Lead. If the proposal includes a volunteer to lead the [WG], a vote or attempt at consensus should first be made to consider the volunteer. If the volunteer is not approved, another should be found and confirmed prior to the [WG] formation.
1. The [SIG] Lead should work closely with the [SIG] to draft a charter for the [WG]. The charter for the [WG] must be contributed through a pull request to a new directory within `docs/governance/special-interest-groups`. The PR must remain open for no less than seven (7) days. During this time, a request for changes from a [SIG] approver may extend the review process.
1. The PR may be merged after the allotted time, if there are no relevant requests for changes. Upon merge of the charter, the [WG] is considered formed.

### Accountability

[WG] Leads must collaborate with their parent [SIG] to provide accountability according to their charters.

## User Groups

**User Groups** are community-driven clusters where individuals with common interests or use-cases gather to share experiences and best practices. Discussion within user groups may result in feedback, suggestions, or contributions to the CCC project based on their real-world usage of cloud services and controls.

### Formation

The formation of a [WG] should follow these steps.

1. Propose the formation of a new [WG] using the [proposal template], completing all necessary fields.
1. Work with the topically relevant [SIG] to schedule a proposal presentation.
1. The [SIG] must resolve any [WG] proposals in a timely manner to limit the number of outstanding 
   issues against the CCC project.

## Governance

The CCC community adheres to a transparent and open governance model. Decisions are made through consensus or vote, depending on the group charter.

Non-technical issues or high-level design decisions may be escalated to the [SC] if a decision or conflict is not resolved by the [SIG] in a timely (relative to the time-sensitivity of the issue).

The highest point of escalation for technical decisions is the Special Interest Group.

## Changes to the Structure

Changes to the community structure can be proposed through pull requests to the governance documentation. All changes must be approved by the [SC] following a public review and voting process.

---

[Code of Conduct]: <https://www.finos.org/code-of-conduct>
[community groups]: <./community-groups.md>
[CODEOWNERS]: <https://github.com/finos/common-cloud-controls/blob/main/CODEOWNERS>
[ccc-participants@finos.org]: <TODO: how do people subscribe to this?>
[Steering Committee Charter]: <./steering/charter.md>
[SC]: <#steering-committee>
[upstream]: https://github.com/kubernetes/community
[proposal template]: <https://github.com/finos/common-cloud-controls/blob/main/.github/ISSUE_TEMPLACE/proposal.md>
