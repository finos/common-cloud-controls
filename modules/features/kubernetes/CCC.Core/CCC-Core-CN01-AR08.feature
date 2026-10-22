@CCC.Core @CCC.Core.CN01 @CCC.Core.CN01.AR08 @PerService @tlp-amber @tlp-red
Feature: CCC.Core.CN01.AR08
  As a security administrator
  I want the assessment limitation recorded explicitly
  So that automated results do not overstate control coverage

  Background:
    Given a cloud api for "{config}" in "api"

  # WHEN a service transmits data using TLS, mutual TLS (mTLS) MUST be
  # implemented to require both client and server certificate authentication.
  # This PerPort mTLS scenario needs a public TLS port that challenges the
  # client certificate. CCC.K8S.CN01.AR02 requires public API access disabled.

  @Behavioural @kubernetes @NotTestable
  Scenario: Verify mTLS client certificate authentication requires evidence outside this automated harness
    Then no-op required
