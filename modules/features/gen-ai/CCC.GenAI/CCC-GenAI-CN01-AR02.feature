@CCC.GenAI @CCC.GenAI.CN01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.GenAI.CN01.AR02 - Block or Sanitise Malicious Input
  As a security administrator
  I want malicious input blocked or sanitised
  So that prompt injection and sensitive data do not reach the model

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "gen-ai"
    And I refer to "{result}" as "svc"

  @Behavioural @gen-ai @SANITY
  Scenario: Blocked input term is rejected by content filter
    When I call "{svc}" with "ApplyContentFilter" using arguments "{input-block-probe-prompt}" and "input"
    Then "{result}" is not an error
    And I refer to "{result}" as "filterResult"
    And I attach "{filterResult}" to the test output as "Blocked input filter result"
    Then "{filterResult.Blocked}" is "true"

  @Behavioural @gen-ai @MAIN @OPT_IN
  Scenario: Blocked input does not reach the model on invoke
    When I call "{svc}" with "InvokeModel" using argument "{input-block-probe-prompt}"
    Then "{result}" is an error
