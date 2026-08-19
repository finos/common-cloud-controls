@CCC.K8S @CCC.K8S.CN07 @CCC.K8S.CN07.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN07.AR01 - Protect workload secret material
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Protect workload secret material
    When I call "{kubernetesService}" with "GetEncryptionAtRestStatus" using argument "{uid}"
    Then "{result}" is not an error
    And "{result.SecretsEncrypted}" is true
    When I call "{kubernetesService}" with "AttemptSecretAccessAsIdentity" using arguments "{uid}", "{test-workload-namespace}", "{protected-secret-name}", "{test-workload-service-account}", and "get"
    Then "{result}" is not an error
    And "{result.Allowed}" is true
    And "{result.ValueMatched}" is true
    When I call "{kubernetesService}" with "AttemptSecretAccessAsIdentity" using arguments "{uid}", "{test-workload-namespace}", "{protected-secret-name}", "{test-workload-service-account-unbound}", and "get"
    Then "{result}" is an error
    When I call "{kubernetesService}" with "FindStaticCloudCredentials" using arguments "{uid}" and "{test-workload-namespace}"
    Then "{result}" is not an error
    And "{result.Findings}" is an array of objects with length "0"
