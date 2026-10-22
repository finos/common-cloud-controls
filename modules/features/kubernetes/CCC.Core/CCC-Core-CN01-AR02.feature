@CCC.Core @CCC.Core.CN01 @CCC.Core.CN01.AR02 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.Core.CN01.AR02
  As a security administrator
  I want the assessment limitation recorded explicitly
  So that automated results do not overstate control coverage

  Background:
    Given a cloud api for "{config}" in "api"

  # WHEN a port is exposed for SSH network traffic, all traffic MUST include a
  # SSH handshake AND be encrypted using SSHv2 or higher.
  # These PerPort SSH scenarios need a public SSH port. CCC.K8S.CN01.AR02
  # requires public API access disabled, and node SSH is covered by CCC.K8S.CN12.

  @Behavioural @kubernetes @NotTestable
  Scenario: Verify SSH protocol version requires evidence outside this automated harness
    Then no-op required

  @Behavioural @kubernetes @NotTestable
  Scenario: Verify SSH uses strong ciphers requires evidence outside this automated harness
    Then no-op required

  @Behavioural @kubernetes @NotTestable
  Scenario: Verify SSH server configuration requires evidence outside this automated harness
    Then no-op required
