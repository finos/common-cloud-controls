@CCC.VPC.CN03 @CCC.VPC.CN03.AR01 @tlp-amber @tlp-red @vpc
Feature: CCC.VPC.CN03.AR01 - Restrict VPC peering requests from non-allowlisted requesters
  As a security administrator
  I want peering requests from non-approved requester VPCs to be denied
  So that network connectivity is restricted to authorized boundaries


  Background:
    Given a cloud api for "{Config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "vpc"
    And I refer to "{result}" as "vpcService"
    And I refer to "{UID}" as "ReceiverVpcId"
    And I refer to "{NonAllowlistedRequesterVpcId}" as "NonAllowlistedRequesterVpcId"
    And I load environment variable "CN03_PEER_TRIAL_MATRIX_FILE" as "PeerTrialMatrixFile"
    And "{ReceiverVpcId}" is not nil

  # Inputs — all set automatically from Terraform outputs in CI (Export Terraform
  # outputs step in cfi-test.yml). For local runs use export-cn03-artifacts.sh
  # or set the vars manually.
  #
  # - CN03_RECEIVER_VPC_ID: no longer used as receiver source in CI — ReceiverVpcId is
  #   now driven by resource iteration ({UID}). Still accepted for local/manual runs.
  # - CN03_NON_ALLOWLISTED_REQUESTER_VPC_ID: requester VPC ID outside allow/disallow lists
  # - CN03_ALLOWED_REQUESTER_VPC_ID_1..N: indexed allowed requester VPC IDs
  # - CN03_DISALLOWED_REQUESTER_VPC_ID_1..N: indexed disallowed requester VPC IDs
  # - CN03_ALLOWED_REQUESTER_VPC_IDS: CSV form of allowed list (also in environment.yaml)
  # - CN03_DISALLOWED_REQUESTER_VPC_IDS: CSV form of disallowed list (also in environment.yaml)
  # - CN03_PEER_OWNER_ID: optional, for cross-account peering
  # - CN03_PEER_TRIAL_MATRIX_FILE: path to JSON trial matrix (audit artifact written
  #   from cn03_peer_trial_matrix_json terraform output); used only by batch scenario
  #
  # The resolver merges all sources (env vars + environment.yaml) and deduplicates.
  # Dry-run is used so no real peering connection is created.

  @Destructive @MAIN @DEFAULT @CCC.VPC
  # Dry-runs every VPC in the disallow-list (terraform fixtures, env vars,
  # environment.yaml) against the in-scope receiver VPC. A guardrail mismatch
  # means a disallowed VPC was permitted — that is a compliance failure.
  Scenario: Enforcement proof (dry-run): all disallowed requesters are denied against in-scope receiver VPC
    When I call "{vpcService}" with "ValidateDisallowListEnforcement" using argument "{ReceiverVpcId}"
    And I attach "{result.Summary}" to the test output as "Disallow-list Enforcement Summary"
    And I attach "{result.Results}" to the test output as "Disallow-list Enforcement"
    Then "{result.ListDefined}" is true
    And "{result.TestedCount}" should be greater than "0"
    And "{result.AllCorrect}" is true
    And "{result.ViolationCount}" is "0"

  @Destructive @MAIN @CCC.VPC
  Scenario: Enforcement proof (dry-run): non-allowlisted requester is denied even when not explicitly listed as disallowed
    Given "{NonAllowlistedRequesterVpcId}" is not nil
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

  @Destructive @SANITY @OPT_IN
  # Dry-runs every VPC in the allow-list against the in-scope receiver VPC.
  # A guardrail mismatch means a legitimately allowed VPC was denied — that
  # indicates misconfigured guardrail policy.
  Scenario: Enforcement sanity (dry-run): all allowed requesters are permitted against in-scope receiver VPC
    When I call "{vpcService}" with "ValidateAllowListEnforcement" using argument "{ReceiverVpcId}"
    And I attach "{result.Results}" to the test output as "Allow-list Enforcement"
    Then "{result.ListDefined}" is true
    And "{result.TestedCount}" should be greater than "0"
    And "{result.AllCorrect}" is true
    And "{result.ViolationCount}" is "0"

  @Destructive @SANITY @OPT_IN
  # Unlike the scenarios above which resolve VPC IDs dynamically from env vars
  # at runtime, this scenario replays a pre-built JSON artifact written directly
  # from Terraform outputs. It covers the same allowed/disallowed dry-runs but
  # from a self-contained file that can be attached to a compliance report and
  # replayed independently of the live environment — making it a portable audit
  # record of exactly which VPC IDs were tested and what the outcomes were.
  Scenario: Batch trial matrix (dry-run): all file-listed requesters match expected outcomes
    Given "{PeerTrialMatrixFile}" is not nil
    When I call "{vpcService}" with "RunVpcPeeringDryRunTrialsFromFile" using argument "{PeerTrialMatrixFile}"
    Then "{result.TotalTrials}" should be greater than "0"
    And "{result.UnexpectedCount}" is "0"
    And "{result.Compliant}" is true
