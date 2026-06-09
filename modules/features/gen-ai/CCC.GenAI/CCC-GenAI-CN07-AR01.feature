@CCC.GenAI @CCC.GenAI.CN07 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.GenAI.CN07.AR01 - Explicit Model Version on Production Calls
  As a security administrator
  I want production model endpoints to use explicit version identifiers
  So that unversioned model drift is prevented

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "gen-ai"
    And I refer to "{result}" as "svc"

  @Behavioural @gen-ai @MAIN
  Scenario: Deployed model version matches pinned configuration
    When I call "{svc}" with "GetDeployedModelVersion"
    Then "{result}" is not an error
    And I refer to "{result}" as "modelVersion"
    And I attach "{modelVersion}" to the test output as "Deployed Model Version"
    Then "{modelVersion.VersionID}" is "{pinned-model-version}"
    And "{modelVersion.IsPinned}" is "true"
