@CCC.Core @CCC.Core.CN01 @tlp-amber @tlp-red @tls
Feature: CCC.Core.CN01.AR08
  As a security administrator
  I want to ensure mutual TLS is implemented for all TLS connections
  So that both client and server are authenticated to prevent unauthorized access


@Behavioural @PerPort @tls @object-storage @virtual-machines @gen-ai
  Scenario: Verify mTLS requires client certificate authentication
    Mutual TLS (mTLS) requires both server and client certificates for authentication.
    This test verifies that the server is configured to require client certificates,
    ensuring that only authenticated clients can establish connections.

    Given "report" contains details of SSL Support type "server-defaults" for "{host-name}" on port "{port-number}"
    Then "{report}" is an array of objects with at least the following contents
      | id         | finding  |
      | clientAuth | required |
