@CCC.K8S @CCC.K8S.CN15 @CCC.K8S.CN15.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN15.AR02 - Protect policy-significant metadata changes
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Protect policy-significant metadata changes
    Given I call "{api}" with "GetServiceAPIWithIdentity" using arguments "kubernetes" and "test-user-no-access"
    And "{result}" is not an error
    And I refer to "{result}" as "unauthorizedKubernetesService"
    When I call "{unauthorizedKubernetesService}" with "AttemptModifyGovernanceMetadata" using arguments "{uid}", "{governance-metadata-target}", and "{governance-metadata-patch}"
    Then "{result}" is an error
