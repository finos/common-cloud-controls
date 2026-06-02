@CCC.Core @CCC.Core.CN01 @tlp-amber @tlp-clear @tlp-green @tlp-red
Feature: CCC.Core.CN01.AR07
  As a security administrator
  I want to ensure that only the IANA-assigned protocol runs on each port
  So that services follow standard port assignments and avoid misconfigurations


@Behavioural @PerPort @http @plaintext
  Scenario: Verify HTTP uses IANA-assigned port 80
    HTTP must use port 80 as assigned by IANA.
    Running HTTP on non-standard ports violates IANA assignments.

    Then "{port-number}" is "80"


@Behavioural @PerPort @http @tls @object-storage @virtual-machines
  Scenario: Verify HTTPS uses IANA-assigned port 443
    HTTPS must use port 443 as assigned by IANA.
    This is the standard port for encrypted web traffic.

    Then "{port-number}" is "443"


@Behavioural @PerPort @ssh
  Scenario: Verify SSH uses IANA-assigned port 22
    SSH must use port 22 as assigned by IANA.
    Running SSH on non-standard ports or other services on port 22 violates IANA assignments.

    Then "{port-number}" is "22"


@Behavioural @PerPort @smtp @plaintext
  Scenario: Verify SMTP uses IANA-assigned port 25
    SMTP must use port 25 as assigned by IANA.
    This is the standard port for mail transfer between servers.

    Then "{port-number}" is "25"


@Behavioural @PerPort @smtp @tls
  Scenario: Verify SMTPS uses IANA-assigned port 465 or 587
    SMTPS can use port 465 (implicit TLS) or 587 (STARTTLS) as assigned by IANA.

    Then "{port-number}" is "465"


@Behavioural @PerPort @dns
  Scenario: Verify DNS uses IANA-assigned port 53
    DNS must use port 53 as assigned by IANA.
    Both TCP and UDP port 53 are reserved for domain name resolution.

    Then "{port-number}" is "53"


@Behavioural @PerPort @ftp @plaintext
  Scenario: Verify FTP uses IANA-assigned port 21
    FTP must use port 21 as assigned by IANA.
    If FTP is disabled for security, this port should not be exposed.

    Then "{port-number}" is "21"


@Behavioural @PerPort @ldap @plaintext
  Scenario: Verify LDAP uses IANA-assigned port 389
    LDAP must use port 389 as assigned by IANA.
    This is the standard port for directory services.

    Then "{port-number}" is "389"


@Behavioural @PerPort @ldap @tls
  Scenario: Verify LDAPS uses IANA-assigned port 636
    LDAPS must use port 636 as assigned by IANA.
    This is the secure LDAP port with implicit TLS.

    Then "{port-number}" is "636"
