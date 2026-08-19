@CCC.K8S @CCC.K8S.CN04 @CCC.K8S.CN04.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN04.AR01 - Require approved digest-pinned images
  As a security administrator
  I want Kubernetes security controls enforced
  So that managed clusters remain within the approved security boundary

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Require approved digest-pinned images
    When I call "{kubernetesService}" with "AttemptAdmitWorkload" using arguments "{uid}", "create", and "{unapproved-tag-image-manifest}"
    Then "{result}" is an error
    And I attach "{result}" to the test output as "Image admission result"
