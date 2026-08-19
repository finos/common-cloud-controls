@CCC.K8S @CCC.K8S.CN09 @CCC.K8S.CN09.AR03 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN09.AR03 - Use compatible supported add-ons
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Use compatible supported add-ons
    When I call "{kubernetesService}" with "GetClusterComponentInventory" using argument "{uid}"
    Then "{result}" is not an error
    And I attach "{result.Addons}" to the test output as "Managed add-on inventory"
    Then "{result.IncompatibleAddons}" is an array of objects with length "0"
    And "{result.UnsupportedAddons}" is an array of objects with length "0"
