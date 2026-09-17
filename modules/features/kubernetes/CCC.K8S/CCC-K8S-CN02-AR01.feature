@CCC.K8S @CCC.K8S.CN02 @CCC.K8S.CN02.AR01 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN02.AR01 - Least-privilege access bindings
  As a security administrator
  I want the assessment limitation recorded explicitly
  So that automated results do not overstate control coverage

  Background:
    Given a cloud api for "{config}" in "api"

  @Behavioural @kubernetes @NotTestable
  Scenario: Least-privilege access bindings requires evidence outside this automated harness
    # An organization entitlement inventory is required to compare responsibilities with approved roles.
    Then no-op required
