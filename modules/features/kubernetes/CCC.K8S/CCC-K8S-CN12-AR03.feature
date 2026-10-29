@CCC.K8S @CCC.K8S.CN12 @CCC.K8S.CN12.AR03 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.K8S.CN12.AR03 - Deny unnecessary workload metadata access
  As a security administrator
  I want the assessment limitation recorded explicitly
  So that automated results do not overstate control coverage

  Background:
    Given a cloud api for "{config}" in "api"

  @Behavioural @kubernetes @NotTestable
  Scenario: Deny unnecessary workload metadata access requires evidence outside this automated harness
    # Honest denial proof needs a dedicated metadata-probe image and Job that
    # the unmanaged workload path can run from inside the cluster.
    Then no-op required
