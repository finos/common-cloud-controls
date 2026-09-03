@CCC.K8S @CCC.K8S.CN04 @CCC.K8S.CN04.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN04.AR02 - Signature and provenance verification
  As a security administrator
  I want the assessment limitation recorded explicitly
  So that automated results do not overstate control coverage

  Background:
    Given a cloud api for "{config}" in "api"

  @Behavioural @kubernetes @NotTestable
  Scenario: Signature and provenance verification requires evidence outside this automated harness
    # A signed-image pipeline and admission verification policy are required before this can run honestly.
    Then no-op required
