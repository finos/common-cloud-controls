@CCC.Core @CCC.Core.CN02 @PerService @tlp-amber @tlp-green @tlp-red
Feature: CCC.Core.CN02.AR01 - Data Encryption at Rest
  As a security administrator
  I want to ensure all stored data is encrypted using industry-standard methods
  So that data confidentiality is protected


  Background:
    Given a cloud api for "{Config}" in "api"

@Behavioural @object-storage
  Scenario: Verify objects are encrypted at rest
    Given I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"
    And "{result}" is not an error
    When I call "{storage}" with "CreateObject" using arguments "{ResourceName}", "test-encryption-check={Timestamp}.txt", and "encryption test data"
    Then "{result}" is not an error
    And I refer to "{result}" as "uploadResult"
    And "{uploadResult.Encryption}" is not null
    And "{uploadResult.EncryptionAlgorithm}" is "AES256"
    And I attach "{uploadResult}" to the test output as "Upload Result with Encryption Details"
