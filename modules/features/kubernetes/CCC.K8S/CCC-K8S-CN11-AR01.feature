@CCC.K8S @CCC.K8S.CN11 @CCC.K8S.CN11.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN11.AR01 - Cover every namespace and admission path
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Cover every namespace and admission path
    When I call "{kubernetesService}" with "AttemptAdmitWorkload" using arguments "{uid}", "create", and "{privileged-workload-manifest}"
    Then "{result}" is an error
    When I call "{kubernetesService}" with "AttemptAdmitWorkload" using arguments "{uid}", "update", and "{privileged-controller-update-manifest}"
    Then "{result}" is an error
    When I call "{kubernetesService}" with "GetAdmissionPolicyCoverage" using argument "{uid}"
    Then "{result}" is not an error
    And "{result.Uncovered}" is an array of objects with length "0"
