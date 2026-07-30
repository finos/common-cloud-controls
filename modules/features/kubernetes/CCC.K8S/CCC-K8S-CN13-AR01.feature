@CCC.K8S @CCC.K8S.CN13 @CCC.K8S.CN13.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN13.AR01 - Require approved CPU and memory bounds
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Require approved CPU and memory bounds
    When I call "{kubernetesService}" with "AttemptAdmitWorkload" using arguments "{uid}", "create", and "{missing-resource-bounds-manifest}"
    Then "{result}" is an error
    When I call "{kubernetesService}" with "AttemptAdmitWorkload" using arguments "{uid}", "create", and "{compliant-resource-bounds-manifest}"
    Then "{result}" is not an error
    And "{result.Admitted}" is true
    And "{result.GeneratedWorkloadRunning}" is true
