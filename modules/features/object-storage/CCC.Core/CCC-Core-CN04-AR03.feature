@CCC.Core @CCC.Core.CN04 @PerService @tlp-red
Feature: CCC.Core.CN04.AR03 - Log Data Read Attempts
  As a security administrator
  I want to ensure all data read attempts are logged
  So that data access is fully auditable


  Background:
    Given a cloud api for "{Instance}" in "api"

@Behavioural @object-storage
  Scenario: Verify data read operations are logged with identity and timestamp
    Given I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"
    Given I call "{api}" with "GetServiceAPI" using argument "logging"
    And I refer to "{result}" as "loggingService"
    When I call "{storage}" with "CreateObject" using arguments "{ResourceName}", "test-read-logging-object={Timestamp}.txt", and "test data for read logging verification"
    Then "{result}" is not an error
    And I refer to "{result}" as "createResult"
    When I call "{storage}" with "ReadObject" using arguments "{ResourceName}" and "test-read-logging-object={Timestamp}.txt"
    Then "{result}" is not an error
    And I refer to "{result}" as "readResult"
    And I attach "{readResult}" to the test output as "Object Read Result"
    And we wait for a period of "10000" ms
    When I call "{loggingService}" with "QueryDataReadLogs" using arguments "{ResourceName}" and "{20}"
    Then "{result}" is not an error
    And I refer to "{result}" as "readLogs"
    And I attach "{readLogs}" to the test output as "Data Read Logs"
    Then "{readLogs}" is an array of objects with at least the following contents
      | result    |
      | Succeeded |
