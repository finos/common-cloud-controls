@CCC.ObjStor @CCC.ObjStor.CN04 @PerService @object-storage @tlp-amber @tlp-clear @tlp-green @tlp-red
Feature: CCC.ObjStor.CN04.AR01
  As a security administrator
  I want objects to automatically receive a default retention policy upon upload
  So that critical data is protected from premature deletion or modification


  Background:
    Given a cloud api for "{Config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"

@Behavioural
  Scenario: Service applies default retention policy to newly uploaded object
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage", "testUserWrite", and "{true}"
    And "{result}" is not an error
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "CreateObject" using arguments "{ResourceName}", "test-retention-object={Timestamp}.txt", and "protected data"
    And I attach "{result}" to the test output as "uploaded-object.json"
    And I call "{userStorage}" with "GetObjectRetentionDurationDays" using arguments "{ResourceName}" and "test-retention-object={Timestamp}.txt"
    Then "{result}" should be greater than "1"


@Behavioural
  Scenario: Service enforces retention policy on newly created objects
    When I call "{storage}" with "CreateObject" using arguments "{ResourceName}", "immediate-delete-test={Timestamp}.txt", and "test content"
    Then "{result}" is not an error
    When I call "{storage}" with "DeleteObject" using arguments "{ResourceName}" and "immediate-delete-test={Timestamp}.txt"
    Then "{result}" is an error
    And I attach "{result}" to the test output as "immediate-delete-error.txt"


@Behavioural
  Scenario: Service validates retention period meets minimum requirements
    When I call "{storage}" with "CreateObject" using arguments "{ResourceName}", "retention-period-test={Timestamp}.txt", and "compliance data"
    And I call "{storage}" with "GetObjectRetentionDurationDays" using arguments "{ResourceName}" and "retention-period-test={Timestamp}.txt"
    Then "{result}" should be greater than "1"
    And I attach "{result}" to the test output as "retention-period-days.json"
