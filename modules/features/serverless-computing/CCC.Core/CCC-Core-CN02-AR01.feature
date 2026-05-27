@CCC.Core @CCC.Core.CN02 @PerService @tlp-amber @tlp-green @tlp-red
Feature: CCC.Core.CN02.AR01 - Encrypt Data For Storage
  As a security administrator
  I want function configuration data to be encrypted at rest
  So that sensitive values remain protected

  Background:
    Given a cloud api for "{Config}" in "api"

  @Behavioural @serverless-computing
  Scenario: Function encryption status reports enabled controls
    Given I call "{api}" with "GetServiceAPI" using argument "serverless-computing"
    And I refer to "{result}" as "svc"
    When I call "{svc}" with "GetFunctionEncryptionStatus" using argument "{UID}"
    Then "{result}" is not an error
    And I refer to "{result}" as "encryption"
    And I attach "{encryption}" to the test output as "Function Encryption Status"
    Then "{encryption.EnvEncrypted}" is "true"
