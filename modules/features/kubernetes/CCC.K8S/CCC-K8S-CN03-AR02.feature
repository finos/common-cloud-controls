@CCC.K8S @CCC.K8S.CN03 @CCC.K8S.CN03.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN03.AR02 - Reject long-lived cloud credentials in workloads
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "k8sControlPlane"
    And I call "{k8sControlPlane}" with "GetKubernetesClient"
    And I refer to "{result}" as "kubeClient"

  @Behavioural @kubernetes @MAIN
  Scenario: Reject long-lived cloud credentials in workloads
    When I call "{kubeClient}" with "FindStaticCloudCredentials" using arguments "{uid}" and "{test-workload-namespace}"
    Then "{result}" is not an error
    And "{result.Findings}" is an array of objects with length "0"
    When I call "{k8sControlPlane}" with "AttemptAdmitWorkload" using arguments "{uid}", "create", and "{static-credential-workload-manifest}"
    Then "{result}" is an error
