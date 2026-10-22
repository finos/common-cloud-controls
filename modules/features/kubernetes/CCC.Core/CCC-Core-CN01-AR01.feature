@CCC.Core @CCC.Core.CN01 @CCC.Core.CN01.AR01 @PerService @tlp-green @tlp-amber @tlp-red
Feature: CCC.Core.CN01.AR01
  As a security administrator
  I want the assessment limitation recorded explicitly
  So that automated results do not overstate control coverage

  Background:
    Given a cloud api for "{config}" in "api"

  # WHEN a port is exposed for non-SSH network traffic, all traffic MUST include
  # a TLS handshake AND be encrypted using TLS 1.3 or higher.
  # These PerPort handshake scenarios need a public TLS port. CCC.K8S.CN01.AR02
  # requires public API access disabled, so the runner has no such port to probe.

  @Behavioural @kubernetes @NotTestable
  Scenario: Service rejects TLS 1.2 traffic requires evidence outside this automated harness
    Then no-op required

  @Behavioural @kubernetes @NotTestable
  Scenario: Service rejects TLS 1.1 traffic requires evidence outside this automated harness
    Then no-op required

  @Behavioural @kubernetes @NotTestable
  Scenario: Verify SSL/TLS protocol support requires evidence outside this automated harness
    Then no-op required

  @Behavioural @kubernetes @NotTestable
  Scenario: Verify no known SSL/TLS vulnerabilities requires evidence outside this automated harness
    Then no-op required

  @Behavioural @kubernetes @NotTestable
  Scenario: Verify TLS 1.3 only certificate validity requires evidence outside this automated harness
    Then no-op required
