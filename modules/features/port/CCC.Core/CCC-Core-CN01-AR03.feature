@CCC.Core @CCC.Core.CN01 @tlp-amber @tlp-green @tlp-red
Feature: CCC.Core.CN01.AR03
  As a security administrator
  I want unencrypted traffic to be blocked or redirected to secure equivalents
  So that no data is transmitted in plaintext


@PerPort @Behavioural @http @tls @object-storage
  Scenario: HTTP redirects to HTTPS
    If HTTP is accessible, it should immediately redirect to HTTPS (301/302 status codes).
    This ensures that all web traffic is encrypted.

    Given a client connects to "{hostName}" with protocol "http" on port "80"
    And I refer to "{result}" as "connection"
    And "{connection}" is not an error
    And I transmit "GET / HTTP/1.1\r\nHost: {hostName}\r\n\r\n" to "{connection}"
    And I attach "{connection}" to the test output as "HTTP response"
    And "{connection.Output}" contains "301"
    And I call "{connection}" with "Close"
    Then "{connection.State}" is "closed"


@PerPort @Behavioural @ftp @tls @object-storage
  Scenario: FTP traffic is blocked or not exposed
    Unencrypted FTP should not be accessible. The service should either refuse connections
    or not expose FTP on standard ports (21).

    Given a client connects to "{hostName}" with protocol "ftp" on port "21"
    And I attach "{connection}" to the test output as "FTP response"
    And I refer to "{result}" as "connection"
    Then "{connection}" is an error


@PerPort @Behavioural @telnet @tls @object-storage
  Scenario: Telnet traffic is blocked or not exposed
    Telnet transmits credentials in plaintext and should be completely disabled.
    SSH should be used instead for remote shell access.

    Given a client connects to "{hostName}" with protocol "telnet" on port "23"
    And I attach "{connection}" to the test output as "Telnet response"
    And I refer to "{result}" as "connection"
    Then "{connection}" is an error


@PerPort @Behavioural @tls @object-storage
  Scenario: Only secure protocols are exposed
    Verify that the service only exposes encrypted protocols by checking that
    all exposed ports use TLS/SSL or other encryption.

    Given "report" contains details of SSL Support type "protocols" for "{hostName}" on port "{portNumber}"
    Then "{report}" is an array of objects with at least the following contents
      | id     | severity |
      | TLS1_2 | OK       |
      | TLS1_3 | OK       |
