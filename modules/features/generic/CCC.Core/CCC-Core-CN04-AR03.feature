@CCC.Core @CCC.Core.CN04 @PerService @tlp-red
Feature: CCC.Core.CN04.AR03 - Log Data Read Attempts
  As a security administrator
  I want to ensure all data read attempts are logged
  So that data access is fully auditable


  Background:
    Given a cloud api for "{config}" in "api"

@Behavioural @object-storage @virtual-machines @serverless-computing @gen-ai
  Scenario: Verify data read operations are logged with identity and timestamp
    Given I call "{api}" with "GetServiceAPI" using argument "{service-type}"
    And I refer to "{result}" as "theService"
    And I call "{api}" with "GetServiceAPI" using argument "logging"
    And I refer to "{result}" as "loggingService"
    When I call "{theService}" with "TriggerDataRead" using argument "{resource-name}"
    And I attach "{result}" to the test output as "Data Read Trigger Result"
    And we wait for a period of "10000" ms
    When I call "{loggingService}" with "QueryLogs" using arguments "{resource-name}", "data-read", and "{20}"
    Then "{result}" is not an error
    And I refer to "{result}" as "readLogs"
    And I attach "{readLogs}" to the test output as "Data Read Logs"
    Then "{readLogs}" is an array of objects with at least the following contents
      | result    |
      | Succeeded |
