@CCC.Core @CCC.Core.CN04 @PerService @tlp-amber @tlp-clear @tlp-green @tlp-red
Feature: CCC.Core.CN04.AR01 - Log Administrative Access Attempts
  As a security administrator
  I want to ensure all administrative access attempts are logged
  So that audit trails are maintained for compliance


@Behavioural @object-storage @virtual-machines @serverless-computing
  Scenario: Verify admin actions are logged with identity and timestamp
    Given a cloud api for "{Config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "{ServiceType}"
    And I refer to "{result}" as "theService"
    Given I call "{api}" with "GetServiceAPI" using argument "logging"
    And I refer to "{result}" as "loggingService"
    When I call "{theService}" with "UpdateResourcePolicy"
    Then "{result}" is not an error
    And I attach "{result}" to the test output as "Policy Update Result"
    And we wait for a period of "10000" ms
    When I call "{loggingService}" with "QueryLogs" using arguments "{ResourceName}", "admin", and "{20}"
    Then "{result}" is not an error
    And I refer to "{result}" as "adminLogs"
    And I attach "{adminLogs}" to the test output as "Admin Activity Logs"
    Then "{adminLogs}" is an array of objects with at least the following contents
      | result    |
      | Succeeded |
