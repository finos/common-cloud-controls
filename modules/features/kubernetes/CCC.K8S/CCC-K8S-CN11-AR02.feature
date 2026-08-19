@CCC.K8S @CCC.K8S.CN11 @CCC.K8S.CN11.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN11.AR02 - Gate and audit admission configuration changes
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Gate and audit admission configuration changes
    Given I call "{api}" with "GetServiceAPIWithIdentity" using arguments "kubernetes" and "test-user-no-access"
    And "{result}" is not an error
    And I refer to "{result}" as "unauthorizedKubernetesService"
    When I call "{unauthorizedKubernetesService}" with "AttemptModifyAdmissionConfig" using arguments "{uid}" and "{admission-test-change}"
    Then "{result}" is an error
