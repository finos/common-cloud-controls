@CCC.K8S @CCC.K8S.CN01 @CCC.K8S.CN01.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN01.AR01 - Restrict API access to approved networks
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "k8sControlPlane"

  # Intended for estates with a public API hostname locked to approved CIDRs and a
  # runner inside that allowlist. The remote reachability probe is the untrusted
  # vantage: TCPConnected must be false. GitHub-hosted CI with ephemeral egress
  # (or an open 0.0.0.0/0 API) cannot satisfy this AR honestly.
  @Behavioural @kubernetes
  Scenario: Restrict API access to approved networks
    When I call "{k8sControlPlane}" with "GetAPIEndpointConfig" using argument "{uid}"
    Then "{result}" is not an error
    And I refer to "{result}" as "endpoint"
    And I attach "{endpoint}" to the test output as "API endpoint configuration"
    And "{endpoint.AllowedCIDRs}" is not empty
    When I call "{k8sControlPlane}" with "AttemptAPIEndpointReachability" using arguments "{uid}" and "untrusted"
    Then "{result}" is not an error
    And I refer to "{result}" as "reachability"
    And I attach "{reachability}" to the test output as "Untrusted API reachability"
    And "{reachability.TCPConnected}" is false
