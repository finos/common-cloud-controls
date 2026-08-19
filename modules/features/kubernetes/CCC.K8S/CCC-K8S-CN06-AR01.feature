@CCC.K8S @CCC.K8S.CN06 @CCC.K8S.CN06.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN06.AR01 - Enforce default-deny network policy
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Enforce default-deny network policy
    When I call "{kubernetesService}" with "GetNamespaceNetworkPolicyStatus" using arguments "{uid}" and "{test-workload-namespace}"
    Then "{result}" is not an error
    And "{result.PolicyCapable}" is true
    And "{result.DefaultDenyIngress}" is true
    And "{result.DefaultDenyEgress}" is true
    When I call "{kubernetesService}" with "AttemptWorkloadNetworkFlow" using arguments "{uid}", "{isolated-probe-selector}", "{network-control-host}", "{network-probe-port}", and "{network-probe-protocol}"
    Then "{result}" is an error
