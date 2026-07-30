@CCC.K8S @CCC.K8S.CN01 @CCC.K8S.CN01.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN01.AR02 - Disable public API access
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Disable public API access
    When I call "{kubernetesService}" with "GetAPIEndpointConfig" using argument "{uid}"
    Then "{result}" is not an error
    And I refer to "{result}" as "endpoint"
    Then "{endpoint.PublicAccess}" is false
    And "{endpoint.PrivateAccess}" is true
    When I call "{kubernetesService}" with "AttemptAPIEndpointReachability" using arguments "{uid}" and "untrusted"
    Then "{result}" is not an error
    And "{result.TCPConnected}" is false
