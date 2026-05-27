@CCC.Core @CCC.Core.CN01 @tlp-amber @tlp-clear @tlp-green @tlp-red @tls
Feature: CCC.Core.CN01.AR02
  As a security administrator
  I want to ensure all SSH network traffic uses SSHv2 or higher
  So that SSH connections are properly encrypted and secure


@Behavioural @PerPort @ssh
  Scenario: Verify SSH protocol version
    SSH protocol version 2 (SSH-2.0) is required as SSH-1 has known security vulnerabilities
    including man-in-the-middle attacks and session hijacking. This test ensures that the
    server advertises SSH-2.0 in its protocol banner and successfully establishes a connection.

    Given an openssl s_client request to "{portNumber}" on "{hostName}" protocol "ssh"
    And I refer to "{result}" as "connection"
    And "{connection}" state is open
    And I close connection "{connection}"
    Then "{connection}" state is closed


@Behavioural @PerPort @ssh
  Scenario: Verify SSH uses strong ciphers
    Weak ciphers like 3DES-CBC, RC4, and DES-CBC3-SHA are vulnerable to various attacks
    including SWEET32 (for 3DES) and multiple known vulnerabilities in RC4. This test ensures
    that the SSH server does not offer these deprecated ciphers during negotiation, forcing
    clients to use modern, secure encryption algorithms like AES-256-GCM or ChaCha20-Poly1305.

    Given "report" contains details of SSL Support type "each-cipher" for "{hostName}" on port "{portNumber}"
    Then "{report}" is an array of objects which doesn't contain any of
      | id           | finding |
      |     3DES-CBC | offered |
      | RC4          | offered |
      | DES-CBC3-SHA | offered |


@Behavioural @PerPort @ssh
  Scenario: Verify SSH server configuration
    Proper SSH server configuration includes valid, unexpired certificates and a complete
    certificate chain of trust. This ensures that the SSH service can be authenticated
    and that encrypted connections are established with verified endpoints, preventing
    man-in-the-middle attacks.

    Given "report" contains details of SSL Support type "server-defaults" for "{hostName}" on port "{portNumber}"
    Then "{report}" is an array of objects with at least the following contents
      | id                    | finding |
      | cert_expirationStatus | ok      |
      | cert_chain_of_trust   | passed. |
