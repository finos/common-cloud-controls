@CCC.GenAI @CCC.GenAI.CN08 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.GenAI.CN08.AR02 - Block Deploy on Unacceptable Risk
  As a security administrator
  I want models blocked from deployment when risk exceeds tolerance
  So that unacceptable models are not promoted to production

  @NotTestable @gen-ai
  Scenario: Risk acceptance gate is not API-testable in CI
    Given deployment gating depends on human risk acceptance
    Then this requirement is verified outside automated behavioural tests
