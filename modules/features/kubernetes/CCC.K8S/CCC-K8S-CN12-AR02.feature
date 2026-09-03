@CCC.K8S @CCC.K8S.CN12 @CCC.K8S.CN12.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN12.AR02 - Prevent public node management access
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Prevent public node management access
    When I call "{kubernetesService}" with "ProbeNodeAdminInterfaces" using arguments "{uid}", "", "{kubelet-ports}", and "{node-mgmt-ports}"
    Then "{result}" is not an error
    And "{result.PublicSSHOpen}" is false
    And "{result.PublicRDPOpen}" is false
