@CCC.K8S @CCC.K8S.CN05 @CCC.K8S.CN05.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN05.AR01 - Reject privileged and host-access workloads
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Reject privileged and host-access workloads
    When I call "{kubernetesService}" with "AttemptAdmitWorkload" using arguments "{uid}", "create", and "{privileged-workload-manifest}"
    Then "{result}" is an error
