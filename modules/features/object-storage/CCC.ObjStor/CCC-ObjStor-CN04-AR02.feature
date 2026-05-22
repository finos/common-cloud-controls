@CCC.ObjStor @CCC.ObjStor.CN04 @PerService @object-storage @tlp-amber @tlp-clear @tlp-green @tlp-red
Feature: CCC.ObjStor.CN04.AR02
  As a security administrator
  I want to prevent deletion or modification of objects under active retention
  So that data integrity and compliance requirements are maintained


  Background:
    Given a cloud api for "{Config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"

@Behavioural
  Scenario: Service prevents object deletion by write user during retention period
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage", "testUserWrite", and "{true}"
    And "{result}" is not an error
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "CreateObject" using arguments "{ResourceName}", "protected-object={Timestamp}.txt", and "immutable data"
    Then "{result}" is not an error
    And I attach "{result}" to the test output as "protected-object.json"
    When I call "{userStorage}" with "DeleteObject" using arguments "{ResourceName}" and "protected-object={Timestamp}.txt"
    Then "{result}" is an error
    And I attach "{result}" to the test output as "delete-protected-error.txt"
    And "{result}" should contain one of "retention, locked, immutable, protected"


@Behavioural
  Scenario: Service prevents object deletion by admin user during retention period
    When I call "{storage}" with "CreateObject" using arguments "{ResourceName}", "admin-protected-object={Timestamp}.txt", and "compliance data"
    Then "{result}" is not an error
    When I call "{storage}" with "DeleteObject" using arguments "{ResourceName}" and "admin-protected-object={Timestamp}.txt"
    Then "{result}" is an error
    And I attach "{result}" to the test output as "admin-delete-protected-error.txt"


@Behavioural
  Scenario: Service prevents object modification during retention period
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage", "testUserWrite", and "{true}"
    And "{result}" is not an error
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "CreateObject" using arguments "{ResourceName}", "modify-test-object={Timestamp}.txt", and "original content"
    Then "{result}" is not an error
    And I attach "{result}" to the test output as "original-object.json"
    When I call "{userStorage}" with "CreateObject" using arguments "{ResourceName}", "modify-test-object={Timestamp}.txt", and "modified content"
    Then "{result}" is an error
    And I attach "{result}" to the test output as "modify-protected-error.txt"
    And "{result}" should contain one of "retention, locked, immutable, protected, exists"


@Behavioural
  Scenario: Service allows object read access during retention period
    When I call "{storage}" with "CreateObject" using arguments "{ResourceName}", "readable-protected-object={Timestamp}.txt", and "readable data"
    Then "{result}" is not an error
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage", "testUserRead", and "{true}"
    And "{result}" is not an error
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "ReadObject" using arguments "{ResourceName}" and "readable-protected-object={Timestamp}.txt"
    Then "{result}" is not an error
    And I refer to "{result}" as "readResult"
    And I attach "{result}" to the test output as "read-protected-object.json"
    And "{readResult.Name}" is "readable-protected-object={Timestamp}.txt"
