@CCC.Core @CCC.Core.CN01 @CCC.Core.CN01.AR03 @PerService @tlp-green @tlp-amber @tlp-red
Feature: CCC.Core.CN01.AR03
  As a security administrator
  I want the assessment limitation recorded explicitly
  So that automated results do not overstate control coverage

  Background:
    Given a cloud api for "{config}" in "api"

  # WHEN the service receives unencrypted traffic, then it MUST either block
  # the request or automatically redirect it to the secure equivalent.
  # These PerPort plaintext scenarios need a public unencrypted port.
  # CCC.K8S.CN01.AR02 requires public API access disabled, so the runner has
  # no HTTP/FTP/Telnet listener to probe.

  @Behavioural @kubernetes @NotTestable
  Scenario: HTTP redirects to HTTPS requires evidence outside this automated harness
    Then no-op required

  @Behavioural @kubernetes @NotTestable
  Scenario: FTP traffic is blocked or not exposed requires evidence outside this automated harness
    Then no-op required

  @Behavioural @kubernetes @NotTestable
  Scenario: Telnet traffic is blocked or not exposed requires evidence outside this automated harness
    Then no-op required

  @Behavioural @kubernetes @NotTestable
  Scenario: Only secure protocols are exposed requires evidence outside this automated harness
    Then no-op required
