@CCC.K8S @CCC.K8S.CN13 @CCC.K8S.CN13.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN13.AR02 - Enforce namespace resource quotas
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Enforce namespace resource quotas
    When I call "{kubernetesService}" with "GetResourceConsumptionBounds" using arguments "{uid}" and "{test-workload-namespace}"
    Then "{result}" is not an error
    And "{result.Quotas}" is not nil
    When I call "{kubernetesService}" with "AttemptAdmitWorkload" using arguments "{uid}", "create", and "{quota-exceed-workload-manifest}"
    Then "{result}" is an error
