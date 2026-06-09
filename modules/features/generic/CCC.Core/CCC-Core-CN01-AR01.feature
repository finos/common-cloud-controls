@CCC.Core @CCC.Core.CN01 @tlp-amber @tlp-green @tlp-red
Feature: CCC.Core.CN01.AR01
  As a security administrator
  I want to ensure all SSH network traffic uses TLS 1.3 or higher
  So that data integrity and confidentiality are protected during transmission

  Background:
    Given a cloud api for "{config}" in "api"

  @Behavioural @PerPort @tls @object-storage @virtual-machines @gen-ai
  Scenario: Service accepts TLS 1.3 encrypted traffic
    Given an openssl s_client request using "tls1_3" to "{port-number}" on "{host-name}" protocol "{protocol}"
    And I refer to "{result}" as "connection"
    And "{connection}" state is open
    And "{connection.State}" is "open"
    And I close connection "{connection}"
    Then "{connection}" state is closed

  @Behavioural @PerPort @tls @object-storage @virtual-machines @gen-ai
  Scenario: Service rejects TLS 1.2 traffic
    Given an openssl s_client request using "tls1_2" to "{port-number}" on "{host-name}" protocol "{protocol}"
    And I refer to "{result}" as "connection"
    And we wait for a period of "40" ms
    Then "{connection.State}" is "closed"

  @Behavioural @PerPort @tls @object-storage @virtual-machines @gen-ai
  Scenario: Service rejects TLS 1.1 traffic
    Given an openssl s_client request using "tls1_1" to "{port-number}" on "{host-name}" protocol "{protocol}"
    And I refer to "{result}" as "connection"
    And we wait for a period of "40" ms
    Then "{connection.State}" is "closed"

  @Behavioural @PerPort @tls @object-storage @virtual-machines @gen-ai
  Scenario: Service rejects TLS 1.0 traffic
    Given an openssl s_client request using "tls1" to "{port-number}" on "{host-name}" protocol "{protocol}"
    And I refer to "{result}" as "connection"
    And we wait for a period of "40" ms
    Then "{connection.State}" is "closed"

  @Behavioural @PerPort @tls @object-storage @virtual-machines @gen-ai
  Scenario: Verify SSL/TLS protocol support
    Given "report" contains details of SSL Support type "protocols" for "{host-name}" on port "{port-number}"
    Then "{report}" is an array of objects which doesn't contain any of
      | id     | finding |
      | SSLv2  | offered |
      | SSLv3  | offered |
      | TLS1   | offered |
      | TLS1_1 | offered |
      | TLS1_2 | offered |
    And "{report}" is an array of objects with at least the following contents
      | id     | finding            |
      | TLS1_3 | offered with final |

  @Behavioural @PerPort @tls @object-storage @virtual-machines @gen-ai
  Scenario: Verify no known SSL/TLS vulnerabilities
    Given "report" contains details of SSL Support type "vulnerable" for "{host-name}" on port "{port-number}"
    Then "{report}" is an array of objects with at least the following contents
      | id            | severity |
      | heartbleed    | OK       |
      | CCS           | OK       |
      | ticketbleed   | OK       |
      | ROBOT         | OK       |
      | secure_renego | OK       |

  @Behavioural @PerPort @tls @object-storage @virtual-machines @gen-ai
  Scenario: Verify TLS 1.3 only certificate validity
    Given "report" contains details of SSL Support type "server-defaults" for "{host-name}" on port "{port-number}"
    Then "{report}" is an array of objects with at least the following contents
      | id                    | severity |
      | cert_expirationStatus | OK       |
      | cert_chain_of_trust   | OK       |
