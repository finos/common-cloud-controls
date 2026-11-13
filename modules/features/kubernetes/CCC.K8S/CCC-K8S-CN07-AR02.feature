@CCC.K8S @CCC.K8S.CN07 @CCC.K8S.CN07.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN07.AR02 - Restrict secret access to required names
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "k8sControlPlane"
    And I call "{k8sControlPlane}" with "GetKubernetesClient"
    And I refer to "{result}" as "kubeClient"

  @Behavioural @kubernetes
  Scenario: The workload can get only the named protected secret
    When I call "{kubeClient}" with "AttemptSecretAccessFromConfig" using arguments "{uid}", "{protected-secret-name}", "{test-workload-service-account}", and "get"
    Then "{result}" is not an error
    And "{result.Allowed}" is true

  @Behavioural @kubernetes
  Scenario: The workload cannot get an unrelated secret
    When I call "{kubeClient}" with "AttemptSecretAccessFromConfig" using arguments "{uid}", "{unrelated-secret-name}", "{test-workload-service-account}", and "get"
    Then "{result}" is an error

  @Behavioural @kubernetes
  Scenario: The workload cannot list secrets
    When I call "{kubeClient}" with "AttemptSecretAccessFromConfig" using arguments "{uid}", "", "{test-workload-service-account}", and "list"
    Then "{result}" is an error

  @Behavioural @kubernetes
  Scenario: The workload cannot watch secrets
    When I call "{kubeClient}" with "AttemptSecretAccessFromConfig" using arguments "{uid}", "", "{test-workload-service-account}", and "watch"
    Then "{result}" is an error
