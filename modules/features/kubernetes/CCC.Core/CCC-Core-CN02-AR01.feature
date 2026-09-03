@CCC.Core @CCC.Core.CN02 @CCC.Core.CN02.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.Core.CN02.AR01 - Encrypt Kubernetes secrets at rest
  As a security administrator
  I want the managed cluster secret store encrypted
  So that persisted Kubernetes secret material is protected

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "kubernetes"
    And I refer to "{result}" as "kubernetesService"

  @Behavioural @kubernetes @MAIN
  Scenario: Kubernetes secrets are encrypted at rest
    When I call "{kubernetesService}" with "GetEncryptionAtRestStatus" using argument "{uid}"
    Then "{result}" is not an error
    And I attach "{result}" to the test output as "Kubernetes encryption-at-rest status"
    And "{result.SecretsEncrypted}" is true
    And "{result.Provider}" is not nil
