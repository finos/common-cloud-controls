@CCC.K8S @CCC.K8S.CN16 @CCC.K8S.CN16.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN16.AR02 - Disable unmanaged human credentials
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "k8sControlPlane"

  @Behavioural @kubernetes
  Scenario: Disable unmanaged human credentials
    When I call "{k8sControlPlane}" with "GetClusterAuthConfig" using argument "{uid}"
    Then "{result}" is not an error
    And "{result.LegacyAuthEnabled}" is false
    And "{result.LocalAccountsEnabled}" is false
    And "{result.StaticClientCertsForHumans}" is false

  @Behavioural @kubernetes @NotTestable
  Scenario: A synthetic static human credential is rejected requires evidence outside this automated harness
    # Live rejection of a synthetic basic-auth or client-cert handshake is opt-in.
    # Some managed control planes remove that path entirely, so a missing handshake
    # is not proof the cluster rejects unmanaged human credentials.
    Then no-op required
