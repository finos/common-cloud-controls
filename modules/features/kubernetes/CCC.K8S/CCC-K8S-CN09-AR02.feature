@CCC.K8S @CCC.K8S.CN09 @CCC.K8S.CN09.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN09.AR02 - Apply security updates through supported mechanisms
  As a security administrator
  I want the assessment limitation recorded explicitly
  So that automated results do not overstate control coverage

  Background:
    Given a cloud api for "{config}" in "api"

  @Behavioural @kubernetes @NotTestable
  Scenario: Apply security updates through supported mechanisms requires evidence outside this automated harness
    # A one-shot CI run cannot observe publication and application of a future vendor security update.
    Then no-op required
