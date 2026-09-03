@CCC.K8S @CCC.K8S.CN12 @CCC.K8S.CN12.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN12.AR01 - Require authentication on node administrative APIs
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Require authentication on node administrative APIs
    When I call "{kubernetesService}" with "ProbeNodeAdminInterfaces" using arguments "{uid}", "", "{kubelet-ports}", and "{node-mgmt-ports}"
    Then "{result}" is not an error
    And I attach "{result}" to the test output as "Node administrative interface probes"
    And "{result.AnonymousKubeletOpen}" is false
