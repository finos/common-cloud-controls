@CCC.Core @CCC.Core.CN01 @CCC.Core.CN01.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.Core.CN01.AR02
  As a security administrator
  I want Core SSH handshake requirements recorded when no public port is exposed
  So that results do not treat a private Kubernetes API as an SSH probe target

  Background:
    Given a cloud api for "{config}" in "api"

  # WHEN a port is exposed for SSH network traffic, all traffic MUST include a
  # SSH handshake AND be encrypted using SSHv2 or higher.
  # CCC.K8S.CN01.AR02 requires public API access disabled, so these PerPort
  # SSH scenarios are not exercised from the runner.

  @Behavioural @kubernetes @NotTestable
  Scenario: Verify SSH protocol version
    Then no-op required

  @Behavioural @kubernetes @NotTestable
  Scenario: Verify SSH uses strong ciphers
    Then no-op required

  @Behavioural @kubernetes @NotTestable
  Scenario: Verify SSH server configuration
    Then no-op required
