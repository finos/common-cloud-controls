@CCC.K8S @CCC.K8S.CN16 @CCC.K8S.CN16.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN16.AR02 - Disable unmanaged human credentials
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Disable unmanaged human credentials
    When I call "{kubernetesService}" with "GetClusterAuthConfig" using argument "{uid}"
    Then "{result}" is not an error
    And "{result.LegacyAuthEnabled}" is false
    And "{result.LocalAccountsEnabled}" is false
    And "{result.StaticClientCertsForHumans}" is false

  @Behavioural @kubernetes @OPT_IN
  Scenario: A synthetic static human credential is rejected
    When I call "{kubernetesService}" with "AttemptClusterAuthWithStaticCredential" using arguments "{uid}" and "{legacy-auth-probe-mode}"
    Then "{result}" is an error
