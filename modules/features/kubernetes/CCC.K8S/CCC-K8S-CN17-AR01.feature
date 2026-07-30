@CCC.K8S @CCC.K8S.CN17 @CCC.K8S.CN17.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN17.AR01 - Separate infrastructure identities
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Separate infrastructure identities
    When I call "{kubernetesService}" with "GetInfrastructureIdentities" using argument "{uid}"
    Then "{result}" is not an error
    And I attach "{result.Principals}" to the test output as "Infrastructure principals"
    And "{result.MissingRequiredRoles}" is an array of objects with length "0"
    And "{result.DuplicateIdentityAssignments}" is an array of objects with length "0"
