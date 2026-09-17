@CCC.K8S @CCC.K8S.CN08 @CCC.K8S.CN08.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN08.AR01 - Organization-controlled add-on allowlist
  As a security administrator
  I want the assessment limitation recorded explicitly
  So that automated results do not overstate control coverage

  Background:
    Given a cloud api for "{config}" in "api"

  @Behavioural @kubernetes @NotTestable
  Scenario: Organization-controlled add-on allowlist requires evidence outside this automated harness
    # Organization allowlist ownership and deny-on-enable enforcement are outside one-shot CI.
    Then no-op required
