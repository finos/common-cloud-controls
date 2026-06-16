@CCC.SecMgmt @CCC.SecMgmt.CN02 @PerService @tlp-amber @tlp-red
Feature: CCC.SecMgmt.CN02.AR01 - Deny Retrieve From Unauthorized Region
  As a security administrator
  I want secrets to be readable only from authorized regions
  So that data residency requirements are enforced

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "secrets"
    And I refer to "{result}" as "svc"

  @Behavioural @secrets @SANITY @OPT_IN
  Scenario: Authorized region read succeeds
    When I call "{svc}" with "RetrieveSecretInRegion" using arguments "{uid}" and "{authorized-region}"
    Then "{result}" is not an error
    And I refer to "{result}" as "authorizedRead"
    And I attach "{authorizedRead}" to the test output as "Authorized Region Read"
    Then "{authorizedRead.Denied}" is "false"

  @Behavioural @secrets @MAIN
  Scenario: Unauthorized region read is denied
    When I call "{svc}" with "RetrieveSecretInRegion" using arguments "{uid}" and "{unauthorized-region}"
    Then "{result}" is an error
