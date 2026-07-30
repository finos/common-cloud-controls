@CCC.K8S @CCC.K8S.CN15 @CCC.K8S.CN15.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN15.AR01 - Require approved governance metadata
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Require approved governance metadata
    When I call "{kubernetesService}" with "GetGovernanceMetadata" using argument "{uid}"
    Then "{result}" is not an error
    And I attach "{result}" to the test output as "Governance metadata"
    And "{result.MissingRequired}" is an array of objects with length "0"
