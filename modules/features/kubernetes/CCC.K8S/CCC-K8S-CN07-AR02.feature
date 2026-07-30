@CCC.K8S @CCC.K8S.CN07 @CCC.K8S.CN07.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN07.AR02 - Restrict secret access to required names
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Restrict secret access to required names
    When I call "{kubernetesService}" with "AttemptSecretAccessAsIdentity" using arguments "{uid}", "{test-workload-namespace}", "{protected-secret-name}", "{test-workload-service-account}", and "get"
    Then "{result}" is not an error
    And "{result.Allowed}" is true
    When I call "{kubernetesService}" with "AttemptSecretAccessAsIdentity" using arguments "{uid}", "{test-workload-namespace}", "{unrelated-secret-name}", "{test-workload-service-account}", and "get"
    Then "{result}" is an error
    When I call "{kubernetesService}" with "AttemptSecretAccessAsIdentity" using arguments "{uid}", "{test-workload-namespace}", "", "{test-workload-service-account}", and "list"
    Then "{result}" is an error
    When I call "{kubernetesService}" with "AttemptSecretAccessAsIdentity" using arguments "{uid}", "{test-workload-namespace}", "", "{test-workload-service-account}", and "watch"
    Then "{result}" is an error
    When I call "{kubernetesService}" with "GetRBACPolicyFindings" using argument "{uid}"
    Then "{result}" is not an error
    And "{result.OverbroadSecretAccess}" is an array of objects with length "0"
