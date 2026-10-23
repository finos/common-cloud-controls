@CCC.K8S @CCC.K8S.CN11 @CCC.K8S.CN11.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN11.AR02 - Gate and audit admission configuration changes
  As a security administrator
  I want the assessment limitation recorded explicitly
  So that automated results do not overstate control coverage

  Background:
    Given a cloud api for "{config}" in "api"

  @Behavioural @kubernetes @NotTestable
  Scenario: Gate and audit admission configuration changes requires evidence outside this automated harness
    # AttemptModifyAdmissionConfig is not wired to CSP admission-config mutation APIs.
    Then no-op required
