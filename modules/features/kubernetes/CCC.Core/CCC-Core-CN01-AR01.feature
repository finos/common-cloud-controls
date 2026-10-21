@CCC.Core @CCC.Core.CN01 @CCC.Core.CN01.AR01 @PerService @tlp-green @tlp-amber @tlp-red
Feature: CCC.Core.CN01.AR01
  As a security administrator
  I want Core TLS handshake requirements recorded when no public port is exposed
  So that results do not treat a private Kubernetes API as an in-transit TLS probe target

  Background:
    Given a cloud api for "{config}" in "api"

  # WHEN a port is exposed for non-SSH network traffic, all traffic MUST include
  # a TLS handshake AND be encrypted using TLS 1.3 or higher.
  # CCC.K8S.CN01.AR02 requires public API access disabled, so these PerPort
  # handshake scenarios are not exercised from the runner.
  @Behavioural @kubernetes @NotTestable
  Scenario: Service rejects TLS 1.2 traffic
    Then no-op required

  @Behavioural @kubernetes @NotTestable
  Scenario: Service rejects TLS 1.1 traffic
    Then no-op required

  @Behavioural @kubernetes @NotTestable
  Scenario: Verify SSL/TLS protocol support
    Then no-op required

  @Behavioural @kubernetes @NotTestable
  Scenario: Verify no known SSL/TLS vulnerabilities
    Then no-op required

  @Behavioural @kubernetes @NotTestable
  Scenario: Verify TLS 1.3 only certificate validity
    Then no-op required
