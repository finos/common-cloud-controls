@CCC.GenAI @CCC.GenAI.CN02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.GenAI.CN02.AR01 - Validate Model Output
  As a security administrator
  I want model output validated before it is returned
  So that policy violations are caught on the output path

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "gen-ai"
    And I refer to "{result}" as "svc"

  @Behavioural @gen-ai @SANITY
  Scenario: Benign output passes content filter
    When I call "{svc}" with "ApplyContentFilter" using arguments "{benign-output-probe-text}" and "output"
    Then "{result}" is not an error
    And I refer to "{result}" as "filterResult"
    And I attach "{filterResult}" to the test output as "Benign output filter result"
    Then "{filterResult.Blocked}" is "false"

  @Behavioural @gen-ai @MAIN @OPT_IN
  Scenario: Benign invoke returns model output to the caller
    When I call "{svc}" with "InvokeModel" using argument "{benign-probe-prompt}"
    Then "{result}" is not an error
    And I refer to "{result}" as "invokeResult"
    And I attach "{invokeResult}" to the test output as "Benign output invoke result"
    Then "{invokeResult.OutputValidated}" is "true"
    And "{invokeResult.Completion}" is not empty
