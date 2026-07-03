@CCC.SecMgmt @CCC.SecMgmt.CN01 @PerService @tlp-amber @tlp-red
Feature: CCC.SecMgmt.CN01.AR01 - Deny Outdated Secret Version After Rotation
  As a security administrator
  I want superseded secret versions to be unusable
  So that compromised credentials cannot be replayed after rotation

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "secrets"
    And I refer to "{result}" as "svc"

  @Behavioural @secrets @SANITY @OPT_IN
  Scenario: Current secret version is readable
    When I call "{svc}" with "RetrieveSecretVersion" using arguments "{uid}" and "latest"
    Then "{result}" is not an error
    And I refer to "{result}" as "currentSecret"
    And I attach "{currentSecret}" to the test output as "Current Secret Version"
    Then "{currentSecret.Denied}" is "false"

  @Behavioural @secrets @MAIN
  Scenario: Stale secret version retrieve is denied
    When I call "{svc}" with "RetrieveSecretVersion" using arguments "{uid}" and "{stale-version-id}"
    Then "{result}" is an error
