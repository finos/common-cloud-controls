@CCC.K8S @CCC.K8S.CN12 @CCC.K8S.CN12.AR03 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN12.AR03 - Deny unnecessary workload metadata access
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Deny unnecessary workload metadata access
    When I call "{kubernetesService}" with "AttemptInstanceMetadataAccess" using arguments "{uid}" and "{metadata-probe-selector}"
    Then "{result}" is an error
    And I attach "{result}" to the test output as "Instance metadata access probe"
