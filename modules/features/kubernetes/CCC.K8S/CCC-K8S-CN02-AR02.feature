@CCC.K8S @CCC.K8S.CN02 @CCC.K8S.CN02.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN02.AR02 - Reject wildcard non-system roles
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Reject wildcard non-system roles
    When I call "{kubernetesService}" with "GetRBACPolicyFindings" using argument "{uid}"
    Then "{result}" is not an error
    And I attach "{result}" to the test output as "RBAC policy findings"
    And "{result.WildcardRoles}" is an array of objects with length "0"
    And "{result.OverbroadSecretAccess}" is an array of objects with length "0"
