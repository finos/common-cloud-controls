# Common Cloud Controls Technical Steering Committee — Governance Process

This document describes how the Common Cloud Controls (CCC) Technical Steering Committee (TSC) operates: how decisions are made, how members join and leave the committee, and how the committee is run.

## Mission and Responsibilities

The CCC Technical Steering Committee (TSC) is the governing body of the CCC project. It provides technical oversight and strategic direction — defining the project's objectives, owning its governance and process, and maintaining the project roadmap. The TSC delegates technical delivery to the working groups and their leads; it does not make technical decisions itself.

The TSC is directly responsible for:

- **Objectives —** defining, evolving, and defending the project's vision, mission, and values.
- **Process —** setting and refining the project's governance, community structure, and decision-making processes.
- **Roadmap —** owning the project [roadmap](#roadmap-planning) and prioritising the direction of the project.
- **Pull requests —** reviewing and voting on governance decisions raised as pull requests (see [Voting](#voting)).

The following are delegated to the working groups and their leads; the TSC does not own them directly:

- Releases and the release process.
- Community assets, such as repositories, infrastructure, websites, and social-media accounts.
- Project tooling and build/test infrastructure.

Responsibilities not explicitly delegated to another group through its charter reside with the TSC. The TSC holds a public community call no less than once per quarter to update stakeholders on all CCC efforts.

## Membership

The TSC is composed of individual members who serve on their own merit, not as representatives of any employer or sponsor. The current members are listed in the [CONTRIBUTING file](/.github/CONTRIBUTING.md), and are also shown for reference in the project [README.md](/README.md).

Members are expected to help govern the project: set direction, vote on committee business, and hold the responsibilities described throughout this document.

### Joining the TSC

Anyone active in the CCC community may seek a seat on the TSC. A candidate is put forward by opening a pull request that adds them to the member list in the [CONTRIBUTING file](/.github/CONTRIBUTING.md), together with a short summary of their contributions to the project. The candidate is admitted by a **majority approval of the TSC**, recorded through the [Voting](#voting) process. Once approved, the pull request adding them to the member list is merged.

### Participation and automatic drop-off

Members are expected to participate actively — through pull requests, reviews, attending TSC meetings, and voting on [decision-log](#decision-log) pull requests.

A member who has made **no meaningful contribution to the project for six (6) months** automatically qualifies for removal at the next periodic membership cleanup. The TSC reviews membership on a regular cadence — at least once per year — and removes members who meet this criterion. This is an automatic housekeeping step, not a judgement of the individual; it keeps the committee's active membership accurate.

A member who leaves the committee for any reason — including automatic drop-off — may reapply at any time through the [Joining the TSC](#joining-the-tsc) process above.

### Removal

Aside from the automatic drop-off above, a member may leave or be removed through the following processes.

#### Resignation

If a member chooses not to continue in their role, for whatever self-elected reason, they must notify the full committee in writing.

#### No confidence

A member may be removed by a **majority approval of the TSC**.

The call for a vote of no confidence will happen in a public TSC meeting and must be documented as a GitHub issue in the repository. It must be made by a current member and seconded by another current member. The member who calls for the vote must include on the issue a statement providing context on the reason for the vote.

Once a vote of no confidence has been called, the committee will notify the community through the CCC mailing list, including a link to the GitHub issue and the statement of context. There will be a period of two (2) weeks for the community to provide feedback — by commenting on the issue, emailing the TSC private mailing list, or messaging individual members. After this feedback period, members must vote on the issue within 48 hours.

If the vote of no confidence is passed, the member in question is immediately removed from the committee.

## Roles

### Chair and Vice Chair

The TSC elects a Chair and a Vice Chair from among its own members.

- **Chair —** curates and distributes the meeting agenda ahead of each TSC meeting, and chairs the meeting. The Chair also serves as the primary communication contact between the project and FINOS.
- **Vice Chair —** acts as Chair when the Chair is unavailable, and supports agenda preparation.

#### Officer eligibility

Only sitting TSC members are eligible to serve as Chair or Vice Chair.

#### Officer selection

Members self-nominate for Chair and Vice Chair. Where there is more than one nominee for a role, the committee elects using the standard decision-making threshold set out under [Routine business](#routine-business).

#### Officer term

Each Officer term runs for a maximum of two years, and is independent of the person's underlying membership — a Chair or Vice Chair may be re-nominated for another Officer term while continuing to serve on the committee, subject to any consecutive-term limit the committee agrees.

An Officer must remain a sitting committee member throughout their Officer term. If they leave the committee for any reason, their Officer term ends immediately and the vacancy process below applies.

#### Officer vacancy

If the Chair vacates the role mid-term, the Vice Chair assumes the Chair role for the remainder of the term, and a nomination and election for the now-vacant Vice Chair seat is held at the next meeting.

## Voting

In the course of the committee's operations, members vote on all decisions made within the body's purview.

### How a vote is held

A matter to be decided is raised as a pull request against the [Decision Log](#decision-log) — the [`DECISIONS.md`](DECISIONS.md) file — describing the proposal and adding its entry. TSC members cast their votes by approving or rejecting that pull request. The member who raises the pull request is counted as voting in favour of the proposal.

- If the proposal **passes**, the pull request is merged, recording the decision as accepted.
- If the proposal **does not pass**, its outcome is set to _rejected_ and the pull request is merged anyway, so the decision — and the fact it was rejected — is still recorded.

Either way the pull request is merged, so every matter put to a vote leaves a permanent, traceable record in the Decision Log. Because voting happens on the pull request, a member does not need to attend a meeting to vote, and votes can be cast at any time before the pull request is resolved.

The [Chair](#chair-and-vice-chair) closes the vote — merging the pull request with its outcome — once the result is clear, or at the latest two weeks after the pull request was opened.

### Routine business

Unless otherwise specified by a process, a vote passes by a **_majority of participating members_** — meaning members who record an approval or rejection on the pull request. This keeps the process workable in practice: a stricter, participation-independent threshold may appear more rigorous, but one that is seldom met yields the same practical outcome as low engagement — decisions fail to progress.

> This general threshold does not override a process that specifies its own, higher bar — such as a [vote of no confidence](#no-confidence) or a [change to this document](#changes).

### Abstention

For any self-elected reason, members may abstain from a vote. A member abstains simply by not recording an approval or rejection on the pull request; abstaining members are not counted among the participating members for that vote.

## Decision Log

Every TSC vote is raised and recorded as a pull request against the Decision Log — a single [`DECISIONS.md`](DECISIONS.md) file — following the process under [Voting](#voting). Because both passed and rejected proposals are merged into the log, it forms a running, traceable record of the committee's decisions — and the reasoning behind them — as membership turns over.

## Roadmap Planning

Suggestions, features, and other proposed direction are raised by the community as GitHub issues. The TSC reviews and prioritises these issues during its [regular meetings](#routine-meetings), owning the project roadmap.

The committee communicates the resulting high-level "north star" direction back to the community, and it can be published on the project website. Where setting or changing direction calls for a formal decision, it is taken through the [Voting](#voting) process.

## Meetings

TSC meetings are open to the public and may be conducted electronically, by teleconference, or in person. Members are generally expected to attend every meeting.

### Routine meetings

The TSC meets on a regular cadence, set by the committee, to conduct routine business. In addition, the TSC holds a public community call no less than once per quarter to update stakeholders and funnel wider engagement — such as user engagement and cross-project coordination — alongside the community all-hands.

### Meeting conduct

Given that the committee's membership may include representatives of competing organizations, each meeting opens with a brief antitrust and competition-law reminder, limiting discussion to the technical and governance matters on the agenda. This is a standing agenda item rather than an informal assumption.

### Quorum

Quorum requires at least half of the TSC members to be present. The committee may continue to meet if quorum is not met, but may not take decisions at that meeting. Formal decisions are, in any case, taken on decision-log pull requests as described under [Voting](#voting).

## Inclusive Leadership Training

Members of the committee must take the [Inclusive Open Source Community Orientation] course in support of our community values. Members are required to report completion of the course as part of on-boarding within 30 days from the date of their appointment.

## Changes

Members may propose a change to this document through the following process:

- Post a pull request to this repository describing the change.
- Call a public vote for the nearest acceptable business day four (4) weeks after initial introduction of the change. A vote may be scheduled earlier if all members consent.
- The change is accepted if two-thirds of the TSC members vote in favor.
- The pull request is merged or closed.

## Attribution

This document was adapted from the Kubernetes Steering Committee Charter [afb3858].

---

[Inclusive Open Source Community Orientation]: https://training.linuxfoundation.org/training/inclusive-open-source-community-orientation-lfc102/
[afb3858]: https://github.com/kubernetes/steering/blob/afb3858/charter.md

<!--
[TSC private mailing list]: !TODO!
-->
