@CCC.VPC.CN03 @CCC.VPC.CN03.AR01 @tlp-amber @tlp-red @vpc
Feature: CCC.VPC.CN03.AR01 - Restrict VPC peering requests from non-allowlisted requesters
  As a security administrator
  I want peering requests from non-approved requester VPCs to be denied
  So that network connectivity is restricted to authorized boundaries

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "vpc"
    And I refer to "{result}" as "vpcService"
    And I refer to "{uid}" as "ReceiverVpcId"
    And "{ReceiverVpcId}" is not nil

  @Behavioural @vpc
  Scenario: All disallowed requesters are denied against the receiver VPC
    When I call "{vpcService}" with "ValidateDisallowListEnforcement" using argument "{ReceiverVpcId}"
    And I attach "{result.Summary}" to the test output as "Disallow-list Enforcement Summary"
    And I attach "{result.Results}" to the test output as "Disallow-list Enforcement"
    Then "{result.ListDefined}" is true
    And "{result.TestedCount}" should be greater than "0"
    And "{result.AllCorrect}" is true
    And "{result.ViolationCount}" is "0"

  @Behavioural @vpc
  Scenario: Non-allowlisted requester is denied even when not on the disallow list
    Given I refer to "{non-allowlisted-requester-vpc-id}" as "NonAllowlistedRequesterVpcId"
    And "{NonAllowlistedRequesterVpcId}" is not nil
    When I call "{vpcService}" with "EvaluatePeerAgainstAllowList" using argument "{NonAllowlistedRequesterVpcId}"
    Then "{result.AllowedListDefined}" is true
    And "{result.Allowed}" is false
    When I call "{vpcService}" with "AttemptVpcPeeringDryRun" using arguments "{NonAllowlistedRequesterVpcId}" and "{ReceiverVpcId}"
    Then "{result.DryRunAllowed}" is false
    And "{result.AllowListDefined}" is true
    And "{result.RequesterInAllowList}" is false
    And "{result.GuardrailExpectation}" is "deny"
    And "{result.GuardrailMismatch}" is false
    And "{result.ExitCode}" should be greater than "0"
    And "{result.Reason}" contains "guardrail aligned"
    And "{result.ConflictType}" is ""

  @Behavioural @vpc
  Scenario: All allowed requesters are permitted against the receiver VPC
    When I call "{vpcService}" with "ValidateAllowListEnforcement" using argument "{ReceiverVpcId}"
    And I attach "{result.Results}" to the test output as "Allow-list Enforcement"
    Then "{result.ListDefined}" is true
    And "{result.TestedCount}" should be greater than "0"
    And "{result.AllCorrect}" is true
    And "{result.ViolationCount}" is "0"
