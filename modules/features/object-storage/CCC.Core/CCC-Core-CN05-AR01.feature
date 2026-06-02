@CCC.Core @CCC.Core.CN05 @PerService @tlp-amber @tlp-clear @tlp-green @tlp-red
Feature: CCC.Core.CN05.AR01 - Block Unauthorized Data Modification
  As a security administrator
  I want to ensure unauthorized entities cannot modify data
  So that data integrity is protected


  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"

@Destructive @Behavioural @object-storage
  Scenario: Service prevents data modification by user with no access
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage", and "test-user-no-access"
    And "{result}" is not an error
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "CreateObject" using arguments "{resource-name}", "test-cn05-unauthorized-modify={timestamp}.txt", and "unauthorized data"
    Then "{result}" is an error
    And I attach "{result}" to the test output as "no-access-create-error.txt"


@Destructive @Behavioural @object-storage
  Scenario: Service allows data modification by user with write access
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage", and "test-user-write"
    And "{result}" is not an error
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "CreateObject" using arguments "{resource-name}", "test-cn05-authorized-modify={timestamp}.txt", and "authorized data"
    Then "{result}" is not an error
    And I attach "{result}" to the test output as "write-create-object-result.json"
