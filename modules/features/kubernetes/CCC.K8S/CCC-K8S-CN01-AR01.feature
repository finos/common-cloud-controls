@CCC.K8S @CCC.K8S.CN01 @CCC.K8S.CN01.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN01.AR01 - Restrict API access to approved networks
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Restrict API access to approved networks
    When I call "{kubernetesService}" with "GetAPIEndpointConfig" using argument "{uid}"
    Then "{result}" is not an error
    And I refer to "{result}" as "endpoint"
    And I attach "{endpoint}" to the test output as "API endpoint configuration"
    Then "{endpoint.PrivateAccess}" is true
    When I call "{kubernetesService}" with "AttemptAPIEndpointReachability" using arguments "{uid}" and "untrusted"
    Then "{result}" is not an error
    And I refer to "{result}" as "reachability"
    And "{reachability.DNSResolved}" is true
    And "{reachability.TCPConnected}" is false
