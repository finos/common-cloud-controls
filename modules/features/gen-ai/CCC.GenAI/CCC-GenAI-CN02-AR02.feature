@CCC.GenAI @CCC.GenAI.CN02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.GenAI.CN02.AR02 - Redact, Encode, or Reject on Output Violation
  As a security administrator
  I want policy-violating output rejected or redacted
  So that users do not receive unfiltered harmful content

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "gen-ai"
    And I refer to "{result}" as "svc"

  @Behavioural @gen-ai @SANITY
  Scenario: Blocked output term is rejected by content filter
    When I call "{svc}" with "ApplyContentFilter" using arguments "{output-block-probe-prompt}" and "output"
    Then "{result}" is not an error
    And I refer to "{result}" as "filterResult"
    And I attach "{filterResult}" to the test output as "Blocked output filter result"
    Then "{filterResult.Blocked}" is "true"

  @Behavioural @gen-ai @MAIN @OPT_IN
  Scenario: Policy-violating model output is blocked on invoke
    When I call "{svc}" with "InvokeModel" using argument "{output-block-probe-prompt}"
    Then "{result}" is an error
