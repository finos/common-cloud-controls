@CCC.K8S @CCC.K8S.CN16 @CCC.K8S.CN16.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN16.AR01 - Use a managed identity provider for human access
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Use a managed identity provider for human access
    When I call "{kubernetesService}" with "GetClusterAuthConfig" using argument "{uid}"
    Then "{result}" is not an error
    And I attach "{result}" to the test output as "Cluster authentication configuration"
    And "{result.ManagedIdP}" is true
