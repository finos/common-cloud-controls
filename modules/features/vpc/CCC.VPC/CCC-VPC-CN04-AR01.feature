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

  # End-to-end behavioural check: generate traffic on the target VPC, then ask
  # the logging service whether new flow log records arrived in the configured
  # sink. The trigger (vpc) and the observation (logging) are split — neither
  # service knows where the other one sends/queries logs; the privateer config
  # holds the truth (logging.aws-flow-log-group-name etc.).
  @Behavioural @MAIN @CCC.VPC
  Scenario: Behavioral check (active): traffic produces flow log records
    Given I refer to "{uid}" as "TargetVpcId"
    When I call "{vpcService}" with "GenerateTestTraffic" using argument "{TargetVpcId}"
    And I refer to "{result.ResourceId}" as "TestResourceId"
    And I refer to "{result.CleanupDeleted}" as "TrafficCleanupDeleted"
    And we wait for a period of "60000" ms
    When I call "{loggingService}" with "QueryLogs" using arguments "{TargetVpcId}", "flow", and "{20}"
    Then "{result}" is not an error
    And I refer to "{result}" as "FlowLogRecords"
    And I attach "{FlowLogRecords}" to the test output as "Flow Log Records"
    And "{TrafficCleanupDeleted}" is true
    # At least one record with log-status=OK proves flow logs are capturing traffic.
    # OK is what AWS reports per-window when records were emitted normally; NODATA/SKIPDATA
    # indicate the window saw no traffic or the hypervisor dropped records (both fail).
    And "{FlowLogRecords}" is an array of objects with at least the following contents
      | result |
      | OK     |
