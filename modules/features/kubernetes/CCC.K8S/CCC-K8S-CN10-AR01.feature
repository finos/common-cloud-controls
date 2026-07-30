@CCC.K8S @CCC.K8S.CN10 @CCC.K8S.CN10.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN10.AR01 - Enforce approved persistent-volume claims
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Enforce approved persistent-volume claims
    When I call "{kubernetesService}" with "AttemptCreatePVC" using arguments "{uid}" and "{disallowed-pvc-manifest}"
    Then "{result}" is an error
    When I call "{kubernetesService}" with "AttemptCreatePVC" using arguments "{uid}" and "{compliant-pvc-manifest}"
    Then "{result}" is not an error
    And "{result.Created}" is true
    And "{result.Bound}" is true
