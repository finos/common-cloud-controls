@CCC.VPC.CN04 @CCC.VPC.CN04.AR01 @tlp-amber @tlp-red @vpc
Feature: CCC.VPC.CN04.AR01 - Flow logs must capture all VPC traffic
  As a security administrator
  I want VPC traffic to be captured and logged
  So that audit and investigation requirements are met


  Background:
    Given a cloud api for "{Instance}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "vpc"
    And I refer to "{result}" as "vpcService"

@Behavioural @MAIN @CCC.VPC
  Scenario: Behavioral check (active): traffic produces flow log records
    Given I refer to "{UID}" as "TargetVpcId"
    When I call "{vpcService}" with "PrepareFlowLogDeliveryObservation" using argument "{TargetVpcId}"
    And I call "{vpcService}" with "GenerateTestTraffic" using argument "{TargetVpcId}"
    And I refer to "{result.ResourceId}" as "TestResourceId"
    And I refer to "{result.CleanupDeleted}" as "TrafficCleanupDeleted"
    And I call "{vpcService}" with "ObserveRecentFlowLogDelivery" using argument "{TargetVpcId}"
    And I refer to "{result.RecordsObserved}" as "RecordsObserved"
    And I call "{vpcService}" with "DeleteTestResource" using argument "{TestResourceId}"
    Then "{result.Deleted}" is true
    And "{TrafficCleanupDeleted}" is true
    And "{RecordsObserved}" is true
