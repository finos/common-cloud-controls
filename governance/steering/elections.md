# Common Cloud Controls (CCC) Steering Committee Elections

This document outlines the process for steering committee elections.

## Eligibility

Restrictions on candidacy and voting are in place to ensure that the 
CCC project is led by individuals who are highly trusted, impactful,
and currently active in the community.

### Eligibility for voting

In order to be eligible for voting, an individual must be:

- A FINOS Member<sup>[1](#footnote1)</sup> who had a substantial contributions 
  to the CCC project within 12 months prior to their nomination.
  Contributions include GitHub events like creating issues, creating PRs,
  reviewing PRs, commenting on issues, etc.
- An appointed or elected member of one or more active [community groups].
  within 4 months prior to their nomination.

_It is the responsibility of the steering committee to refine these criteria
prior to each election, including setting the number of required contributions,
and adding any additional committee memberships that include eligibility._

### Eligibility for candidacy

In order to be eligible for candidacy, an individual must:

* Be eligible for voting in the current Steering Committe election.
* Accept a nomination or self-nominate.
* Be endorsed by another party from their own employer.
* Be endorsed by at least one eligible voter from a financial institution who is
  not the candidate's employer.

In the event that multiple candidates from the same employer are nominated for a
reserved seat, only the candidate with the most votes will be selected.

Refer to the [elections procedure] for more information
about how to nominate and endorse candidates in any CCC election.

### Eligibility for Nomination and Endorsement

Any FINOS member may nominate as many people as they wish to. We recommend that
you validate the eligibility of your candidate prior to nomination.

[Eligible voters](#eligibility-for-voting) may endorse nominees or campaign
as they see fit.

## Terms and Election Cycles

Steering committee members are elected to serve a two (2) year term. Members 
can serve two (2) consecutive terms and a lifetime of four terms.
Terms that result in less than or equal to one (1) year served are exempt.

Election cycles are scheduled such that roughly half of the seats come up for
re-election each year for purposes of continuity.  The exact number of seats
alternates between 3 and 4.

### Bootstrap Election

In the inaugural election of 2024, 4 seats will be allocated for one (1) year 
terms, for the purpose of staggering all future elections. The committee will 
be responsible for self-allocation of these seats.

### Emeritus Term

Members of the steering committee who complete a term will graduate to becoming 
Emeritus members of the steering committee upon vacating their seat. This confers
honor on the recipient, acknowledging the significant contributions they have made
to the project. Emeritus members have no binding vote, and no expectation of continued
participation in steering committee affairs.

## Election schedule and operation

The steering committee (after the Bootstrap election) is responsible for the selection 
of election officers to operate the election and circulate an exact election timeline
to the community. The steering committee should provide the election officer with a
desired timeline based on current community needs.

For example:

- End of July
  - Election officers
  - Voter eligibility criteria
  - Election preparation
- September   
  - Nomination period and election
- October  
  - Conclusion of Election
  - Results announced at first community meeting after the election concludes

The election officers will choose exact dates for each step and propose the
final schedule to steering per the [election procedure].

### Election Officer Eligibility

The steering committee should choose multiple election officers using
the following criteria, so as to promote healthy rotation and diversity:

- Each individual must be eligible to vote.
- Each individual must have been a FINOS member for at least one year.
- At least one election officer should have served before.
- At least one election officer should have never served before.
- Each officer should come from a different employer.
- Each officer can be relied upon to follow the [election procedure].  

History of election officers:  

|Year|Officers|
|---|---|
| 2024 | TBD |

## Steering Committee and Election Officer Recusal

Currently serving steering committee members and the appointed election officers
pledge to recuse themselves from any form of electioneering, including
campaigning, nominating, or endorsing. Violations of this pledge should lead to
a vote of no confidence in the offending party.

Steering committee members _may_ ask other contributors to consider running,
and they _may_ vote, so long as this information is kept private.

Steering committee members who intend to run for re-election _may_
self-nominate but are otherwise expected to adhere to this recusal.

## Attribution

This document was adapted from the Kubernetes Steering Committee Elections document
[[afb3858](upstream)].

## Footnotes

<a name="footnote1">1</a>: A FINOS Member in this context is any individual who is employed
by a FINOS member organization. FINOS Staff and non-members are excluded from participation 
by definition— This is to encourage proper participation and representation from the full
community of FINOS Members.

---

[community groups]: ./community.md

[Condorcet]: https://en.wikipedia.org/wiki/Condorcet_method

[election procedure]: ./elections-procedure.md

[devstats-sql]: https://github.com/cncf/devstats/blob/master/metrics/shared/project_developer_stats.sql
[devstats-dashboard]: https://k8s.devstats.cncf.io/d/13/developer-activity-counts-by-repository-group?orgId=1&var-period_name=Last%20year&var-metric=contributions&var-repogroup_name=All

[bootstrap committee member]: https://github.com/CCC/steering#initial-bootstrap-committee
[elections]: https://github.com/CCC/community/tree/master/elections/steering
[members]: https://github.com/CCC/community/blob/master/community-membership.md

[upstream]: https://github.com/kubernetes/steering/blob/afb3858/elections.md