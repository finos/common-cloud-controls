@CCC.K8S @CCC.K8S.CN18 @CCC.K8S.CN18.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN18.AR02 - Enable node boot-integrity verification
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Enable node boot-integrity verification
    When I call "{kubernetesService}" with "GetNodeIntegrityStatus" using argument "{uid}"
    Then "{result}" is not an error
    And I attach "{result.Nodes}" to the test output as "Node boot integrity status"
    And "{result.BootIntegrityDisabledNodes}" is an array of objects with length "0"
