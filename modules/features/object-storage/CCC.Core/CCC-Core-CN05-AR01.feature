@CCC.Core @CCC.Core.CN05 @PerService @tlp-amber @tlp-clear @tlp-green @tlp-red
Feature: CCC.Core.CN05.AR01 - Block Unauthorized Data Modification
  As a security administrator
  I want to ensure unauthorized entities cannot modify data
  So that data integrity is protected


  Background:
    Given a cloud api for "{Instance}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"
    And I call "{api}" with "GetServiceAPI" using argument "iam"
    And I refer to "{result}" as "iamService"

@Destructive @Behavioural @object-storage
  Scenario: Service prevents data modification by user with no access
    Given I call "{iamService}" with "ProvisionUserWithAccess" using arguments "test-user-no-access", "{UID}", and "none"
    And I refer to "{result}" as "testUserNoAccess"
    And I attach "{result}" to the test output as "no-access-user-identity.json"
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage", "{testUserNoAccess}", and "{false}"
    And "{result}" is not an error
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "CreateObject" using arguments "{ResourceName}", "test-cn05-unauthorized-modify={Timestamp}.txt", and "unauthorized data"
    Then "{result}" is an error
    And I attach "{result}" to the test output as "no-access-create-error.txt"


@Destructive @Behavioural @object-storage
  Scenario: Service allows data modification by user with write access
    Given I call "{iamService}" with "ProvisionUserWithAccess" using arguments "test-user-write-access", "{UID}", and "write"
    And I refer to "{result}" as "testUserWrite"
    And I attach "{result}" to the test output as "write-user-identity.json"
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage", "{testUserWrite}", and "{true}"
    And "{result}" is not an error
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "CreateObject" using arguments "{ResourceName}", "test-cn05-authorized-modify={Timestamp}.txt", and "authorized data"
    Then "{result}" is not an error
    And I attach "{result}" to the test output as "write-create-object-result.json"
