@CCC.K8S @CCC.K8S.CN14 @CCC.K8S.CN14.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN14.AR01 - Export Kubernetes API audit logs
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Export Kubernetes API audit logs
    Given I call "{api}" with "GetServiceAPI" using argument "logging"
    And I refer to "{result}" as "loggingService"
    When I call "{kubernetesService}" with "UpdateResourcePolicy"
    Then "{result}" is not an error
    And we wait for a period of "10000" ms
    When I call "{loggingService}" with "QueryLogs" using arguments "{uid}", "admin", and "{20}"
    Then "{result}" is not an error
    And "{result}" is an array of objects with at least the following contents
      | result    |
      | Succeeded |
