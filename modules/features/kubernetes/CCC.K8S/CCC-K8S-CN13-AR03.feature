@CCC.K8S @CCC.K8S.CN13 @CCC.K8S.CN13.AR03 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN13.AR03 - Bound workload and node autoscaling
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Bound workload and node autoscaling
    When I call "{kubernetesService}" with "GetResourceConsumptionBounds" using arguments "{uid}" and "{test-workload-namespace}"
    Then "{result}" is not an error
    And I attach "{result.AutoscalerMax}" to the test output as "Autoscaler maximum boundaries"
    And "{result.AutoscalerWithinApprovedMax}" is true
