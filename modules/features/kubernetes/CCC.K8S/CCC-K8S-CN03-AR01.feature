@CCC.K8S @CCC.K8S.CN03 @CCC.K8S.CN03.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN03.AR01 - Use workload identity federation
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Use workload identity federation
    When I call "{kubernetesService}" with "GetWorkloadIdentityStatus" using arguments "{uid}", "{test-workload-namespace}", and "{test-workload-service-account}"
    Then "{result}" is not an error
    And I refer to "{result}" as "boundIdentity"
    Then "{boundIdentity.Federated}" is true
    And "{boundIdentity.CloudIdentityID}" is not nil
    And "{boundIdentity.LongLivedKeysPresent}" is false
    When I call "{kubernetesService}" with "GetWorkloadIdentityStatus" using arguments "{uid}", "{test-workload-namespace}", and "{test-workload-service-account-unbound}"
    Then "{result}" is not an error
    And "{result.Federated}" is false

  @Behavioural @kubernetes @OPT_IN
  Scenario: An unbound service account cannot use the workload cloud identity
    When I call "{kubernetesService}" with "AttemptCloudAPIAsWorkload" using arguments "{uid}", "{test-workload-namespace}", "{test-workload-service-account-unbound}", and "{wi-probe-action}"
    Then "{result}" is an error
