@CCC.Core @CCC.Core.CN04 @PerService @tlp-amber @tlp-red
Feature: CCC.Core.CN04.AR02 - Log Data Modification Attempts
  As a security administrator
  I want to ensure all data modification attempts are logged
  So that data changes are auditable


  Background:
    Given a cloud api for "{config}" in "api"

@Behavioural @object-storage @virtual-machines @serverless-computing
  Scenario: Verify data modifications are logged with identity and timestamp
    Given I call "{api}" with "GetServiceAPI" using argument "{service-type}"
    And I refer to "{result}" as "theService"
    And I call "{api}" with "GetServiceAPI" using argument "logging"
    And I refer to "{result}" as "loggingService"
    When I call "{theService}" with "TriggerDataWrite" using argument "{resource-name}"
    And I attach "{result}" to the test output as "Data Write Trigger Result"
    And we wait for a period of "10000" ms
    Then I call "{loggingService}" with "QueryLogs" using arguments "{resource-name}", "data-write", and "{20}"
    And I refer to "{result}" as "dataLogs"
    And I attach "{dataLogs}" to the test output as "Data Write Logs"
    Then "{dataLogs}" is an array of objects with at least the following contents
      | result    |
      | Succeeded |
