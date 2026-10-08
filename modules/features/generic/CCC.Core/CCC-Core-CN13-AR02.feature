@CCC.Core @CCC.Core.CN13 @CCC.Core.CN13.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.Core.CN13.AR02 - Rotate service certificates before expiry
  As a security administrator
  I want unsupported evidence requirements recorded explicitly
  So that automated results do not overstate control coverage

  Background:
    Given a cloud api for "{config}" in "api"

  @Behavioural @kubernetes @NotTestable
  Scenario: Rotate service certificates before expiry requires evidence outside this automated harness
    # Rotation cadence cannot be observed from a single API-endpoint certificate probe.
    Then no-op required
