@CCC.GenAI @CCC.GenAI.CN03 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.GenAI.CN03.AR01 - Approved Source and Provenance
  As a security administrator
  I want training and RAG data sources explicitly approved and documented
  So that unvetted data cannot enter production systems

  @NotTestable @gen-ai
  Scenario: Provenance documentation workflow is not API-testable in CI
    Given provenance documentation is a human approval workflow
    Then this requirement is verified outside automated behavioural tests
