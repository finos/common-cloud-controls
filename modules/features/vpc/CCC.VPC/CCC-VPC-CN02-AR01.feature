@CCC.VPC.CN02 @CCC.VPC.CN02.AR01 @tlp-red @vpc
Feature: CCC.VPC.CN02.AR01 - No external IP by default in public subnets
  As a security administrator
  I want to ensure resources created in public subnets are not assigned an external IP address by default
  So that public exposure is minimized


  Background:
    Given a cloud api for "{Config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "vpc"
    And I refer to "{result}" as "vpcService"

  # Public subnet: has a route to an Internet Gateway (IGW)
  # Default external IP assignment: subnet setting MapPublicIpOnLaunch = true

  @Behavioural @MAIN @CCC.VPC
  # Uses CN_TEST_AMI_ID from compliance-testing.env when set (region-specific AMI ID).
  # If CN_TEST_AMI_ID is blank, the VPC service resolves a default AMI and still launches an instance.
  # This scenario is tagged @MAIN and runs by default — it will launch and delete a short-lived EC2 instance.
  Scenario: Behavioural check (active): resource launched in public subnet is not assigned an external IP
    Given I refer to "{UID}" as "TargetVpcId"
    When I call "{vpcService}" with "SelectPublicSubnetForTest" using argument "{TargetVpcId}"
    And I refer to "{result.SubnetId}" as "TestSubnetId"
    And I call "{vpcService}" with "CreateTestResourceInSubnet" using argument "{TestSubnetId}"
    And I refer to "{result.ResourceId}" as "TestResourceId"
    And I call "{vpcService}" with "GetResourceExternalIpAssignment" using argument "{TestResourceId}"
    And I refer to "{result.HasExternalIp}" as "HasExternalIp"
    # And we wait for a period of "20000" ms # uncomment to allow visible confirmation for checking instance live for 20 seconds
    Then "{HasExternalIp}" is false
    When I call "{vpcService}" with "DeleteTestResource" using argument "{TestResourceId}"
    Then "{result.Deleted}" is true
