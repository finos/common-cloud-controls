# Common Cloud Controls Steering Committee Charter

This document outlines the mission, scope, and objectives of the Common Cloud Controls (CCC) Steering Committee.

## Mission

The CCC Steering Committee is the governing body of the CCC project, providing decision-making and oversight pertaining to the CCC project bylaws, sub-organizations, and financial planning. The Steering Committee also defines the project values and structure.

## Approach

- Adapt the role and structure of the Steering Committee to meet the ongoing needs of the project.
- Responsibilities not explicitly delegated to other parties<sup>[2](#footnote2)</sup> through their respective charters reside with the Steering Committee.
- All management<sup>[1](#footnote1)</sup> responsibilities should be delegated to other parties<sup>[2](#footnote2)</sup>.
- All technical responsibilities should be delegated to working groups. The Steering Committee should not retain any technical responsibilities itself.
- The steering committee will hold a public community call no less than once per quarter to provide updates to stakeholders regarding all CCC efforts.

## Direct responsibilities of the Steering Committee

The following responsibilities belong directly to the Steering Committee.

- Define, evolve, and defend the non-technical vision / mission and the values of the project.
- Delegate ownership of, responsibility for, and authority over areas of the project to specific entities<sup>[2](#footnote2)</sup>.
- Charter and refine policy for defining new community groups<sup>[3](#footnote3)</sup>, and establish transparency and accountability policies for such groups.
- Appoint leadership for chartered community groups.
- Enforce charters for community groups<sup>[3](#footnote3)</sup> to ensure ongoing positive standing, or decomission any groups not in good standing.
- Define and evolve project and group<sup>[3](#footnote3)</sup> governance structures and policies<sup>[4](#footnote4)</sup>.
- Act as a final non-technical escalation point for any CCC community group or technical effort.
- Decide who is a standing member on the CCC project, and what privileges that entails.
- Control and delegate access to and establish processes regarding project resources<sup>[5](#footnote5)</sup>.
- Coordinate with FINOS regarding usage of the CCC brand and deciding which things can be called "Common Cloud Controls," as well as how that mark can be used in relation to other efforts or vendors.
- Request funds and other support from FINOS (e.g. marketing, press, etc).
- Interface with the FINOS Staff point of contact as needed for guidance and accountability.

## Non-responsibilities of the Steering Committee

- Technical decision-making.
- Chartering, approval, or oversight of any sub-groups created by Steering-chartered community groups (those which are authorized to do so within their charter).
- Files and resources outside of:
  - the CCC project README.md
  - Steering Committee governance documentation

## FINOS Point of Contact

In addition to general foundation support given to projects, the Steering Committee will have an assigned point of contact. This should be tracked in the same documentation as the list of current Steering Commmittee members.

## Membership

### Composition

The Steering Committee is composed of seven (7) members and shall always be considered this size regardless of temporary vacancies, for the purpose of voting majority and supermajority considerations.

**Reserved Seats —** Four (4) seats on the committee are reserved for FINOS members from financial services institutions. These seats may not be occupied by more than one individual from the same institution<sup>[6](#footnote6)</sup>. In the event that a committee member occupying an FSI seat undergoes a change of employment, they may retain their seat while in noncompliance for 30 calendar days before it is automatically considered vacant.

**Community Seats —** Three (3) seats on the committee are not reserved, and may be filled by any community member from any organization.

### Elections

Every year, the Steering Committee holds a general election for open seats.

Our [election policy] document covers the details for how this works.

### Vacancies

In the event of a resignation or other loss of an elected committee member, the next most preferred candidate from the previous election will be offered the seat. A maximum of one (1) committee member may be selected this way between elections.

In case this fails to fill the seat, a special election for that position will be held as soon as possible.

[Eligible voters] from the most recent election will vote in the special election (eligibility will not be redetermined at the time of the special election).

A committee member elected in a special election will serve out the remainder of the term for the person they are replacing, regardless of the length of that remainder.

### Minimum participation

Committee members are expected to participate actively in the committee's work. If a member's participation falls below a minimum level set by the committee — for example, a minimum number of meetings attended per quarter — their seat is automatically considered vacant, after which the [Vacancies](#vacancies) process applies. Votes cast on decision-log pull requests count towards participation.

_The specific participation threshold is to be set by the committee._

### Removal

A committee member may remove themselves or be removed through the following processes.

#### Resignation

If a committee member chooses not to continue in their role, for whatever self-elected reason, they must notify the full committee in writing.

#### No confidence

A Steering Committee member may be removed by an affirmative vote of a **_three-quarters supermajority of the [fixed membership of the committee](#composition)_**.

The call for a vote of no confidence will happen in a public Steering Committee meeting and must be documented as a GitHub issue in the repository.

The call for a vote of no confidence must be made by a current member of the committee and must be seconded by another current member. The committee member who calls for the vote must include on the issue a statement which provides context on the reason for the vote.

Once a vote of no confidence has been called, the committee will notify the community through the CCC mailing list.

This notification will include:

- a link to the aforementioned GitHub issue
- the statement providing context on the reason for the vote

There will be a period of two (2) weeks for members of the community to reach out to Steering Committee members to provide feedback.

Community members may provide feedback by the following methods:

- comment on the GitHub issue
- send an email to the Steering Committee private mailing list
  - the mailing list will be launched and linked here after the first phase of bootstraping is complete
- send a message to individual committee members

After this feedback period, Steering Committee members must vote on the issue within 48 hours.

If the vote of no confidence is passed, the member in question will be immediately removed from the committee.

## Roles

This section defines the roles that carry specific responsibilities on the committee. Committee composition and the seat lifecycle are covered under [Membership](#membership); the functional process these roles feed into for releases is covered under [Release Governance](#release-governance).

### Members

Steering Committee members are the elected seat-holders described under [Membership](#membership). They set project direction, vote on committee business, and hold the responsibilities defined throughout this charter.

### Chair and Vice Chair

The Steering Committee elects a Chair and a Vice Chair from among its own members.

- **Chair** — curates and distributes the meeting agenda ahead of each Steering Committee meeting, and chairs the meeting.
- **Vice Chair** — acts as Chair when the Chair is unavailable, and supports agenda preparation.

#### Officer eligibility

Only sitting Steering Committee members are eligible to serve as Chair or Vice Chair. The Chair must hold one of the seats [reserved for financial services institution (FSI) members](#composition), reflecting FSI members' role in driving the project's direction.

#### Officer selection

Committee members self-nominate for Chair and Vice Chair. Where there is more than one nominee for a role, the committee elects using the standard decision-making threshold set out under [Routine business](#routine-business).

#### Officer term

Each Officer term runs for a maximum of two years, and is independent of the person's underlying Steering Committee election term — a Chair or Vice Chair may be re-nominated for another Officer term while continuing to serve on the committee, subject to any consecutive-term limit the committee agrees.

An Officer must remain a sitting committee member throughout their Officer term. If they leave the committee for any reason, their Officer term ends immediately and the vacancy process below applies.

#### Officer vacancy

If the Chair vacates the role mid-term, the Vice Chair assumes the Chair role for the remainder of the term, and a nomination and election for the now-vacant Vice Chair seat is held at the next meeting. This is separate from, and does not affect, the person's underlying Steering Committee seat.

### Cyber Security Leads

Each firm holding an [FSI-reserved seat](#composition) designates a **Cyber Security Lead** to carry [release sign-off](#release-governance), in addition to — and distinct from — the individual it has elected to the committee itself. This is the existing Cyber Security Lead role recorded alongside the [membership list].

This designation is tied to the firms currently represented on the Steering Committee. If a firm's Steering Committee seat changes hands, its Cyber Security Lead designation carries over independently unless the firm chooses to change it.

A Cyber Security Lead is expected to take part in releases regularly. If participation falls below a minimum level set by the committee — for example, a minimum number of releases signed off over a given period — the firm is asked to re-confirm or re-designate its Cyber Security Lead.

_The specific participation threshold is to be set by the committee._

## Release Governance

Release sign-off is a defined, limited responsibility of the Steering Committee, delivered through named delegates — the designated [Cyber Security Leads](#cyber-security-leads) — rather than the committee reviewing releases directly. The mechanics of the release process itself live in the [Releases community guideline].

Every release requires sign-off from the relevant Working Group lead, plus at least one designated Cyber Security Lead. There is no separate emergency or expedited path, and no distinction between material and non-material changes — all releases go through the same requirement.

The two sign-offs must come from two different people. A Working Group lead may also be a designated Cyber Security Lead; where the relevant Working Group lead holds both roles, the Cyber Security Lead sign-off must come from a _different_ designated Cyber Security Lead, so the approver pool stays independent of the release's author.

## Voting

In the course of the committee's operations, members will be expected to vote on all decisions made within the body's purview.

### How a vote is held

A matter to be decided is raised as a pull request against the [Decision Log](#decision-log) — the `DECISIONS.md` file — describing the proposal and adding its entry. Steering Committee members cast their votes by approving or rejecting that pull request.

- If the proposal **passes**, the pull request is merged, recording the decision as accepted.
- If the proposal **does not pass**, its outcome is set to _rejected_ and the pull request is merged anyway, so the decision — and the fact it was rejected — is still recorded.

Either way the pull request is merged, so every matter put to a vote leaves a permanent, traceable record in the Decision Log.

Because voting happens on the pull request, a member does not need to attend a meeting to vote, and votes can be cast at any time before the pull request is resolved.

### Routine business

Unless otherwise specified by a process, a vote passes by a **_majority of participating members_** — meaning members who record an approval or rejection on the pull request — rather than a majority of the [fixed membership of the committee](#composition) regardless of engagement. This is intended to be workable in practice: a stricter, participation-independent threshold may appear more rigorous, but one that is seldom met yields the same practical outcome as low engagement — decisions fail to progress.

Regardless of the overall majority, **_at least two (2) votes from holders of [FSI-reserved seats](#composition) are required for any vote to pass_**. This gives the process a meaningful floor without requiring a supermajority of the whole committee to be present.

> This general threshold does not override a process that specifies its own, higher bar — such as a [vote of no confidence](#no-confidence) or a [change to this charter](#changes).

### Abstention

For any self-elected reason, members of the committee may decide to abstain from a vote. A member abstains simply by not recording an approval or rejection on the pull request; abstaining members are not counted among the participating members for that vote.

## Decision Log

Every Steering Committee vote is raised and recorded as a pull request against the Decision Log — a single [`DECISIONS.md`](DECISIONS.md) file — following the process under [Voting](#voting). Because both passed and rejected proposals are merged into the log, it forms a running, traceable record of the committee's decisions — and the reasoning behind them — as committee membership turns over.

## Roadmap Planning

A roadmap session is held twice a year, timed after OSFF NY and OSFF London, to set project direction. Direction may be informed by the feedback and observations gathered at those events.

- Sessions are open to the community.
- Sessions are co-facilitated by designated [Cyber Security Leads](#cyber-security-leads) alongside Working Group leads, so both business-direction and technical-feasibility perspectives are represented.
- Draft outcomes are published for community comment before being brought to the Steering Committee for a vote under [Voting](#voting).
- Once approved, outcomes are published on the project website and as GitHub issues.

This is separate from, and additional to, the Steering Committee's existing quarterly public community call.

## Meetings

Steering Committee members are generally expected to attend every meeting.

### Routine meetings

The Steering Committee meets on a regular cadence, set by the committee, to conduct routine committee business. These working meetings are private and invite-only: attendance is limited to committee members and any guests the committee invites. This keeps the committee's own business focused and funnels wider engagement — such as user engagement and cross-project coordination — to the public [quarterly community call](#approach) and the community all-hands.

### Meeting conduct

Given that the committee's membership includes representatives of competing financial institutions and other competing organizations, each meeting opens with a brief antitrust and competition-law reminder, limiting discussion to the technical and governance matters on the agenda. This is a standing agenda item rather than an informal assumption.

### Quorum

A meeting may proceed with a **_majority of the [fixed membership of the committee](#composition)_** present.

Formal decisions are not taken in the meeting itself — they are made on decision-log pull requests as described under [Voting](#voting) — so there is no separate, higher quorum threshold to hold a vote. The [majority-of-participating-members rule, together with the minimum of two FSI votes](#routine-business), is intended to be the safeguard against a small, unrepresentative group deciding matters alone.

## Inclusive Leadership Training

Members of the committee must take the [Inclusive Open Source Community Orientation] course
in support of our community values. Members are required to report completion of the course as part of on-boarding within 30 days from the date of their appointment.

## Changes

Committee members may propose a change to this document through the following process:

- Post a pull request to this repository describing the change.
- Call a public vote for the nearest acceptable business day four (4) weeks after initial
  introduction of the change. A vote may be scheduled earlier if all committee members consent.
- The change is accepted if three-quarters of the committee members vote in favor.
- The pull request is merged or closed.

## Attribution

This document was adapted from the Kubernetes Steering Committee Charter [afb3858].

## Footnotes

<a name="footnote1">1</a>: Decisions and work pertaining to the daily operations of the project.

<a name="footnote2">2</a>: Such as individuals and [community groups].

<a name="footnote3">3</a>: Community groups include Special Interest Groups, Working Groups, and Committees.

<a name="footnote4">4</a>: This includes the process for contributors to become maintainers or reviewers.

<a name="footnote5">5</a>: Including repositories, artifact repositories, build and test infrastructure, web sites and their domains, blogs, social-media accounts, etc.

<a name="footnote6">6</a>: When determining organizational affiliation, operationally interconnected organizations should be considered a single entity for the purpose of this rule.

---

[election policy]: elections.md
[Eligible voters]: elections.md#eligibility-for-voting
[Releases community guideline]: /docs/community-guidelines/releases/README.md
[membership list]: /README.md#finos-ccc-steering-committee
[Inclusive Open Source Community Orientation]: https://training.linuxfoundation.org/training/inclusive-open-source-community-orientation-lfc102/
[afb3858]: https://github.com/kubernetes/steering/blob/afb3858/charter.md
[community groups]: ../community-structure.md#working-groups

<!--
[Steering Committee private mailing list]: !TODO!
-->
