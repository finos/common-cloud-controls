# Change Management Board

This document is a [community guideline].

## Purpose

The document outlines and defines the guidelines for the Change Management Board (CMB) for the Common Cloud Controls (CCC) project.

The CMB is a body of representatives from financial institutions of varying sizes and types. Its primary role is to review and approve changes and new catalogs that are within the Release Candidate. The CMB collectively represents end-user stakeholders, ensuring that each artifact is adaptable to the needs of a wide range of institutions while maintaining consistency and integrity across the board.

## Membership

The change management board is comprised of a Release Manager and the body of reviewers.

A release cycle shall be a minimum of one month, during which time a Release Manager will solicit and arbitrate feedback from the reviewers prior to approving and initiating the release.

### Release Manager Responsibilities

The release manager is not a unilateral authority on the release, rather they are the representative of the group's opinions. Insomuch as they represent the CMB, the release manager holds the final guidance in the lifecycle of an asset.

The release manager will be responsible for the following:

- Collaborate with the CCC working group leads to ensure that the asset is ready for review.
- Issue an announcement to the CMB, containing:
  - Links to the asset under review
  - Desired release date
  - Deadline for initial responses (two weeks prior to desired release date)
  - Instructions for participating in this review cycle
- When a change request (CR) is received:
  - Evaluate the quality of the CR. If necessary, request adjustments for clarity or conciseness.
  - Relay the CR to all participating reviewers
  - At least two members must agree on a CR before it moves forward, with majority opinion ruling when there is dissent.
  - When discussion has been stabilized for at least 48 hours, determine the status of the CR
  - If the CR is affirmed by the CMB, create a GitHub issue detailing the CR. Tag and notify the appropriate working group.
  - If the CR is not affirmed by the CMB, notify the change requestor. The CR should not be resubmitted unless there are substantial changes to the request.
- When all outstanding requests have been resolved and requested changes have been applied, initiate the release.
  - Ensure that the release is no sooner than the expected delivery date, and that all actions follow the current processes of the [Delivery WG].

### Reviewer Responsibilities

Members are **not** obligated to review every release but will be notified and may choose to engage in reviews.

When engaging, the following is expected of a CMB member:

- Be thorough, thoughtful, and provide detailed feedback before requesting changes.
  - Gather feedback from colleagues as needed to support a review.
- If changes are requested, communicate clearly and promptly through the channels outlined by the Release Manager for the current release cycle.
  - When a change request (CR) is received, the Release Manager will open discussions and facilitate responses from the board.
- Members are encouraged to respond within 7 days if they have input on a CR.
  - The Release Manager logs any dissenting opinions and communicates the majority decision.
- A release cannot proceed without 5 approvals; members are encouraged to help meet this threshold by approving or requesting changes.

### Qualifications for Participation

Individuals of any background or experience level may participate in a review.

To approve or request changes, an individual must be an appointed CMB member in good standing.

CMB members are appointed by the [Delivery WG]. If you are interested or have any questions, please reach out to a current [Delivery WG] member or join the community call.

### Release Manager Qualifications

A release manager shall be a [Delivery WG] approver or a CMB member who has provided feedback on a previous release cycle.

Release managers are expected to demonstrate the following qualities:

- Strong written communication skills
- High attention to detail
- Commitment to process and protocol
- Ability to parse and relay complex feedback
- Fundamental knowledge of the domain featured in the release
- Reasonable availability and responsiveness during the release cycle (at least one month)

### Breach of Decorum

Members of the Change Management Board are expected to follow the [FINOS Community Code of Conduct](https://community.finos.org/docs/governance/code-of-conduct) at all times.

Appointments shall be permanently revoked in the following cases:

- Repeat disrespectful communication
- Repeat obstructive behavior such as vague or non-actionable feedback
- Repeat abandonment of a stated commitment
- Undermining the process, such as deliberately circumventing or disregarding documented norms

## Process

The process followed by the CMB to manage changes includes:

1. **Proposal Submission**

   - Proposed changes are submitted for CMB review by contributors or working groups within the CCC project.

2. **Review Cycle**

   - The CMB reviews the changes based on the established guidelines and feedback from relevant working groups such as the [Security WG], [Delivery WG], and others.

3. **Approval or Request for Modifications**

   - After review, the CMB either approves the proposed changes for the next release candidate or requests modifications and additional feedback from the contributor or associated working group.

4. **Final Approval and Release**
   - Upon receiving approval, the release manager compiles the final release package, and the CMB confirms the official release of the updated framework.

## Collaboration with Working Groups

The CMB works closely with the following working groups:

- [Delivery WG]: Oversees the delivery and implementation of the proposed changes.

[Security WG]: ../working-groups/security/charter.md
[Delivery WG]: ../working-groups/delivery/charter.md
[community guideline]: ./README.md
