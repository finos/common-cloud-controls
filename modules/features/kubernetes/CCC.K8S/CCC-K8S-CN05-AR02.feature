@CCC.K8S @CCC.K8S.CN05 @CCC.K8S.CN05.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN05.AR02 - Enforce secure Linux runtime settings
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Enforce secure Linux runtime settings
    When I call "{kubernetesService}" with "AttemptAdmitWorkload" using arguments "{uid}", "create", and "{insecure-security-context-manifest}"
    Then "{result}" is an error
    When I call "{kubernetesService}" with "GetWorkloadRuntimeSecurity" using arguments "{uid}" and "{security-probe-selector}"
    Then "{result}" is not an error
    And I refer to "{result}" as "runtime"
    Then "{runtime.UID}" should be greater than "0"
    And "{runtime.AllowPrivilegeEscalation}" is false
    And "{runtime.CapabilitiesEmpty}" is true
    And "{runtime.SeccompProfile}" is "RuntimeDefault"
