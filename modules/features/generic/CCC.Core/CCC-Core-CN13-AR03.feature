@CCC.Core @CCC.Core.CN13 @CCC.Core.CN13.AR03 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.Core.CN13.AR03 - Use approved certificate authorities
  As a security administrator
  I want unsupported evidence requirements recorded explicitly
  So that automated results do not overstate control coverage

  Background:
    Given a cloud api for "{config}" in "api"

  @Behavioural @kubernetes @NotTestable
  Scenario: Use approved certificate authorities requires evidence outside this automated harness
    # Managed API-server CA lifecycle requires provider and organization trust-policy evidence.
    Then no-op required
