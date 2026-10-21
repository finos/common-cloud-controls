@CCC.VPC.CN04 @CCC.VPC.CN04.AR01 @tlp-amber @tlp-red @vpc
Feature: CCC.VPC.CN04.AR01 - Flow logs must capture all VPC traffic
  As a security administrator
  I want VPC traffic to be captured and logged
  So that audit and investigation requirements are met

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "vpc"
    And I refer to "{result}" as "vpcService"
    And I call "{api}" with "GetServiceAPI" using argument "logging"
    And I refer to "{result}" as "loggingService"

  # Generate traffic on the target VPC, then query the logging sink from privateer config.
  @Behavioural @vpc
  Scenario: Traffic produces flow log records
    Given I refer to "{uid}" as "TargetVpcId"
    When I call "{vpcService}" with "GenerateTestTraffic" using argument "{TargetVpcId}"
    And I refer to "{result.ResourceId}" as "TestResourceId"
    And I refer to "{result.CleanupDeleted}" as "TrafficCleanupDeleted"
    # Flow-log sinks lag behind live packets.
    And we wait for a period of "60000" ms
    When I call "{loggingService}" with "QueryLogs" using arguments "{TargetVpcId}", "flow", and "{20}"
    Then "{result}" is not an error
    And I refer to "{result}" as "FlowLogRecords"
    And I attach "{FlowLogRecords}" to the test output as "Flow Log Records"
    And "{TrafficCleanupDeleted}" is true
    And "{FlowLogRecords}" is an array of objects with at least the following contents
      | result |
      | OK     |
