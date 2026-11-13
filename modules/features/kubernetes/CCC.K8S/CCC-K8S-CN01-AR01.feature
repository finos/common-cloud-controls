@CCC.K8S @CCC.K8S.CN01 @CCC.K8S.CN01.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN01.AR01 - Restrict API access to approved networks
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "k8sControlPlane"

  # Catalog: private cluster endpoint where possible, otherwise a CIDR allowlist.
  # RestrictedToApprovedNetworks is true for a private-only API (empty AllowedCIDRs
  # is expected — CSP authorized-IP lists apply to a public frontend) or a public
  # API locked to non-open CIDRs. The remote probe is the untrusted vantage.
  @Behavioural @kubernetes
  Scenario: Restrict API access to approved networks
    When I call "{k8sControlPlane}" with "GetAPIEndpointConfig" using argument "{uid}"
    Then "{result}" is not an error
    And I refer to "{result}" as "endpoint"
    And I attach "{endpoint}" to the test output as "API endpoint configuration"
    And "{endpoint.RestrictedToApprovedNetworks}" is true
    When I call "{k8sControlPlane}" with "AttemptAPIEndpointReachability" using arguments "{uid}" and "untrusted"
    Then "{result}" is not an error
    And I refer to "{result}" as "reachability"
    And I attach "{reachability}" to the test output as "Untrusted API reachability"
    And "{reachability.TCPConnected}" is false
