@CCC.Core @CCC.Core.CN01 @CCC.Core.CN01.AR03 @PerService @tlp-green @tlp-amber @tlp-red
Feature: CCC.Core.CN01.AR03
  As a security administrator
  I want Core plaintext-redirect requirements recorded when no public port is exposed
  So that results do not treat a private Kubernetes API as an unencrypted-traffic target

  Background:
    Given a cloud api for "{config}" in "api"

  # WHEN the service receives unencrypted traffic, then it MUST either block
  # the request or automatically redirect it to the secure equivalent.
  # CCC.K8S.CN01.AR02 requires public API access disabled, so these PerPort
  # plaintext scenarios are not exercised from the runner.

  @Behavioural @kubernetes @NotTestable
  Scenario: HTTP redirects to HTTPS
    Then no-op required

  @Behavioural @kubernetes @NotTestable
  Scenario: FTP traffic is blocked or not exposed
    Then no-op required

  @Behavioural @kubernetes @NotTestable
  Scenario: Telnet traffic is blocked or not exposed
    Then no-op required

  @Behavioural @kubernetes @NotTestable
  Scenario: Only secure protocols are exposed
    Then no-op required
