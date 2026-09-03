@CCC.K8S @CCC.K8S.CN17 @CCC.K8S.CN17.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN17.AR02 - Least-privilege infrastructure identities
  As a security administrator
  I want the assessment limitation recorded explicitly
  So that automated results do not overstate control coverage

  Background:
    Given a cloud api for "{config}" in "api"

  @Behavioural @kubernetes @NotTestable
  Scenario: Least-privilege infrastructure identities requires evidence outside this automated harness
    # An approved effective-permission inventory is required for an honest least-privilege comparison.
    Then no-op required
