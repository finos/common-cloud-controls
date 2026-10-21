@CCC.Core @CCC.Core.CN01 @CCC.Core.CN01.AR08 @PerService @tlp-amber @tlp-red
Feature: CCC.Core.CN01.AR08
  As a security administrator
  I want Core mTLS requirements recorded when no public TLS port is exposed
  So that results do not treat a private Kubernetes API as an mTLS probe target

  Background:
    Given a cloud api for "{config}" in "api"

  # WHEN a service transmits data using TLS, mutual TLS (mTLS) MUST be
  # implemented to require both client and server certificate authentication.
  # CCC.K8S.CN01.AR02 requires public API access disabled, so this PerPort
  # mTLS scenario is not exercised from the runner.

  @Behavioural @kubernetes @NotTestable
  Scenario: Verify mTLS requires client certificate authentication
    Then no-op required
