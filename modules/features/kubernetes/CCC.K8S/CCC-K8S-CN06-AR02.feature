@CCC.K8S @CCC.K8S.CN06 @CCC.K8S.CN06.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN06.AR02 - Allow only explicitly selected network flows
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Allow only explicitly selected network flows
    When I call "{kubernetesService}" with "AttemptWorkloadNetworkFlow" using arguments "{uid}", "{network-probe-selector}", "{network-allowlist-host}", "{network-probe-port}", and "{network-probe-protocol}"
    Then "{result}" is not an error
    And "{result.Connected}" is true
    When I call "{kubernetesService}" with "AttemptWorkloadNetworkFlow" using arguments "{uid}", "{network-probe-selector}", "{network-denylist-host}", "{network-probe-port}", and "{network-probe-protocol}"
    Then "{result}" is an error
