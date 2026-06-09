@CCC.Core @CCC.Core.CN11 @PerService @tlp-amber @tlp-red
Feature: CCC.Core.CN11.AR03 - Customer-Managed Encryption Keys
  As a security administrator
  I want generative AI data stores to use customer-managed encryption keys
  So that key lifecycle is under organisational control

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "gen-ai"
    And I refer to "{result}" as "svc"

  @Behavioural @gen-ai @MAIN @OPT_IN
  Scenario: Knowledge base uses a customer-managed key when configured
    When I call "{svc}" with "GetEncryptionConfiguration" using argument "{kb-id}"
    Then "{result}" is not an error
    And I refer to "{result}" as "encryption"
    And I attach "{encryption}" to the test output as "KB CMK configuration"
    Then "{encryption.KMSKeyID}" is not empty
