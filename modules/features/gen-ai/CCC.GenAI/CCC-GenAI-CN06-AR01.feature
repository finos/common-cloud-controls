@CCC.GenAI @CCC.GenAI.CN06 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.GenAI.CN06.AR01 - Least Privilege for Plugins and Tools
  As a security administrator
  I want LLM-invoked tools to operate with least privilege
  So that escalated actions outside tool scope are denied

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "gen-ai"
    And I refer to "{result}" as "svc"

  @Behavioural @gen-ai @MAIN
  Scenario: Escalated tool action is denied
    When I call "{svc}" with "InvokeTool" using arguments "{plugin-tool-name}" and "{plugin-denied-action}"
    Then "{result}" is an error

  @Behavioural @gen-ai @SANITY @OPT_IN
  Scenario: Allowed tool action succeeds
    When I call "{svc}" with "InvokeTool" using arguments "{plugin-tool-name}" and "{plugin-allowed-action}"
    Then "{result}" is not an error
    And I refer to "{result}" as "toolResult"
    Then "{toolResult.Allowed}" is "true"
