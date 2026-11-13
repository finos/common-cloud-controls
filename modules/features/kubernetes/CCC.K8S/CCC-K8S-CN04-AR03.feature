@CCC.K8S @CCC.K8S.CN04 @CCC.K8S.CN04.AR03 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN04.AR03 - Deny critically vulnerable images
  As a security administrator
  I want the assessment limitation recorded explicitly
  So that automated results do not overstate control coverage

  Background:
    Given a cloud api for "{config}" in "api"

  @Behavioural @kubernetes @NotTestable
  Scenario: Deny critically vulnerable images requires evidence outside this automated harness
    # A vulnerability scanner integrated with admission is required before this can run honestly.
    Then no-op required
