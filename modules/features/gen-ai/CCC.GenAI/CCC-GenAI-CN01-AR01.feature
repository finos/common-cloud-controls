@CCC.GenAI @CCC.GenAI.CN01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.GenAI.CN01.AR01 - Validate Input Before Model
  As a security administrator
  I want untrusted input validated before it reaches a GenAI model
  So that malicious or sensitive content is filtered at the boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "gen-ai"
    And I refer to "{result}" as "svc"

  @Behavioural @gen-ai @SANITY
  Scenario: Benign input passes content filter
    When I call "{svc}" with "ApplyContentFilter" using arguments "{benign-probe-prompt}" and "input"
    Then "{result}" is not an error
    And I refer to "{result}" as "filterResult"
    And I attach "{filterResult}" to the test output as "Benign input filter result"
    Then "{filterResult.Blocked}" is "false"

  @Behavioural @gen-ai @MAIN @OPT_IN
  Scenario: Benign prompt reaches the model on invoke
    When I call "{svc}" with "InvokeModel" using argument "{benign-probe-prompt}"
    Then "{result}" is not an error
    And I refer to "{result}" as "invokeResult"
    And I attach "{invokeResult}" to the test output as "Benign invoke result"
    Then "{invokeResult.InputValidated}" is "true"
    And "{invokeResult.Completion}" contains "{benign-probe-expected}"
