@CCC.VPC.CN02 @CCC.VPC.CN02.AR01 @tlp-red @vpc
Feature: CCC.VPC.CN02.AR01 - No external IP by default in public subnets
  As a security administrator
  I want to ensure resources created in public subnets are not assigned an external IP address by default
  So that public exposure is minimized

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "vpc"
    And I refer to "{result}" as "vpcService"

  @Behavioural @vpc
  Scenario: Resource launched in public subnet is not assigned an external IP
    Given I refer to "{uid}" as "TargetVpcId"
    When I call "{vpcService}" with "SelectPublicSubnetForTest" using argument "{TargetVpcId}"
    And I refer to "{result.SubnetId}" as "TestSubnetId"
    And I call "{vpcService}" with "CreateTestResourceInSubnet" using argument "{TestSubnetId}"
    And I refer to "{result.ResourceId}" as "TestResourceId"
    And I call "{vpcService}" with "GetResourceExternalIpAssignment" using argument "{TestResourceId}"
    And I refer to "{result.HasExternalIp}" as "HasExternalIp"
    And I call "{vpcService}" with "DeleteTestResource" using argument "{TestResourceId}"
    Then "{result.Deleted}" is true
    And "{HasExternalIp}" is false
