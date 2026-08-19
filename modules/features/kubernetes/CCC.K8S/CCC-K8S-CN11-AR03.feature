@CCC.K8S @CCC.K8S.CN11 @CCC.K8S.CN11.AR03 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN11.AR03 - Fail closed when an external webhook is unavailable
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Fail closed when an external webhook is unavailable
    Given I call "{api}" with "GetServiceAPI" using argument "admission-webhook"
    And I refer to "{result}" as "webhookService"
    When I call "{webhookService}" with "SetBackendAvailability" using arguments "{uid}" and "false"
    Then "{result}" is not an error
    And "{result.RegistrationPresent}" is true
    And "{result.FailurePolicy}" is "Fail"
    When I call "{kubernetesService}" with "AttemptAdmitWorkload" using arguments "{uid}", "create", and "{webhook-compliant-probe-manifest}"
    Then "{result}" is an error
    When I call "{webhookService}" with "SetBackendAvailability" using arguments "{uid}" and "true"
    Then "{result}" is not an error
    And "{result.ReadyEndpoints}" should be greater than "0"
