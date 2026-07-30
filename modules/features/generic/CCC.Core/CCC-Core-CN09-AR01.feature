@CCC.Core @CCC.Core.CN09 @CCC.Core.CN09.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.Core.CN09.AR01 - Separate security-log storage from service accounts
  As a security administrator
  I want unsupported evidence requirements recorded explicitly
  So that automated results do not overstate control coverage

  Background:
    Given a cloud api for "{config}" in "api"

  @Behavioural @kubernetes @NotTestable
  Scenario: Separate security-log storage from service accounts requires evidence outside this automated harness
    # Organization logging-account isolation requires external IAM and retention evidence.
    Then no-op required
