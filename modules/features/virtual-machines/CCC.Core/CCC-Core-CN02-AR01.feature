@CCC.Core @CCC.Core.CN02 @PerService @tlp-amber @tlp-green @tlp-red
Feature: CCC.Core.CN02.AR01 - Encrypt Data For Storage
  As a security administrator
  I want to ensure VM volumes are encrypted at rest
  So that stored data is protected

  Background:
    Given a cloud api for "{Config}" in "api"

  @Behavioural @virtual-machines
  Scenario: VM attached volumes report encryption enabled
    Given I call "{api}" with "GetServiceAPI" using argument "virtual-machines"
    And I refer to "{result}" as "vmService"
    When I call "{vmService}" with "GetVolumeEncryptionStatus" using argument "{UID}"
    Then "{result}" is not an error
    And I refer to "{result}" as "encryption"
    And I attach "{encryption}" to the test output as "Volume Encryption Status"
    Then "{encryption.Volumes}" is an array of objects with at least the following contents
      | Encrypted |
      | true      |
