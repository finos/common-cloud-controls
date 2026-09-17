@CCC.Core @CCC.Core.CN13 @CCC.Core.CN13.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.Core.CN13.AR01 - Use valid service certificates
  As a security administrator
  I want unsupported evidence requirements recorded explicitly
  So that automated results do not overstate control coverage

  Background:
    Given a cloud api for "{config}" in "api"

  @Behavioural @kubernetes @NotTestable
  Scenario: Use valid service certificates requires evidence outside this automated harness
    # Dedicated generic certificate-lifecycle scenarios have not yet been centralized.
    Then no-op required
