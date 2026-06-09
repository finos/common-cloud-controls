@CCC.Core @CCC.Core.CN02 @PerService @tlp-amber @tlp-green @tlp-red
Feature: CCC.Core.CN02.AR01 - Data Encryption at Rest
  As a security administrator
  I want generative AI knowledge stores encrypted at rest
  So that indexed data confidentiality is protected

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "gen-ai"
    And I refer to "{result}" as "svc"

  @Behavioural @gen-ai @MAIN
  Scenario: Knowledge base backing store is encrypted at rest
    When I call "{svc}" with "GetEncryptionConfiguration" using argument "{kb-id}"
    Then "{result}" is not an error
    And I refer to "{result}" as "encryption"
    And I attach "{encryption}" to the test output as "KB encryption configuration"
    Then "{encryption.EncryptionEnabled}" is "true"
