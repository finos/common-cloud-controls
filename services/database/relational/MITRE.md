# Relational Database Management Systems MITRE Threats

## Discussion points:

> * Is the philosophy correct?
>   * MITRE Threat applicable to a service described using Gherkin
>   * Gherkin to be used to create tests that test control behavior not configuration.
> * What is the idealized format for the Gherkin
>   * Do we need a common list of threat actors and so on
> * Should the threats be presented as per taxonomy feature or as per MITRE ATT&CK Matrix Tactic & Technique
> * Some of the Gherkin will describe destructive tests, how do we flag these?
> * Should this information be recorded in a Gherkin Feature Doc

This document takes the [MITRE ATT&CK Enterprise Cloud IAAS matrix](https://attack.mitre.org/matrices/enterprise/cloud/iaas/) and for each Tactic under a Technique heading, describes an attack on the RDMS service using Gherkin. This can be used to then test the behavior of applied controls under the philosophy that security tests test for behavior not for expected configuration.

## Gherkin Format

The suggested format (for discussion) is:

```gherkin
Scenario: THREAT ID - Human readable threat description  
    Given Service  
    And Taxonomy Feature  
    When A "<THREAT ACTOR>" requests/ enacts attack x  
    And Attack success criteria  
    Then MITRE ATT&CK Tactic - MITRE Technique Ref  
    And Loss of Service Taxonomy Feature C/I/A 
```

| Threat Actor |
| ---|
| Unprivileged Insider |
| Privileged Insider |
| Authenticated Internet based attacker with leaked credential |
| Unauthenticated Internet based attacker |
| Unauthenticated attacker on the network |

For example:

```gherkin
 Scenario: RDMS-T005 Attacker disables logs
    Given An RDMS instance
    And CCC-RDMS-10 Ensure the system supports logging
    When A "<THREAT ACTOR>" requests disabling of logging
    And request is successful
    Then Defense Evasion - T1562.008 Impair Defenses: Disable or Modify Cloud logs
    And loss of non repudiation
```

## Initial Access

### T1190 Exploit Public-Facing Application

```gherkin
Scenario: RDMS-T001 Vulnerable Internet facing RDMS instance exploited
    Given RDMS  
    When An Unauthenticated Internet Based Attacker exploits a vulnerability in a internet facing RDMS instance with "<PAYLOAD>"
    And Response is "<RESPONSE>"
    Then Initial Access - T1190 Exploit Public-Facing Application
    And "<IMPACT>"
```

| PAYLOAD | RESPONSE | IMPACT |
| ---|---| ---|
| TBC | TBC | |

### T1199 Trusted Relationship

### T1078 Valid Accounts

```gherkin
Scenario: RDMS-T002 RDMS Credential Compromised by internet based attacker
    Given RDMS
    And CCC-RDMS-1 SQL Support
    When an Internet Based Attacker attempts to execute "<QUERY>"
    And uses a leaked credential for authentication
    And the system returns and expected value: "<RESPONSE>"
    Then Initial Access - T1078 Valid Accounts
    And loss of RDMS confidentiality, integrity and availability 
```

Examples:

>These are largely random at present, and should be refined further

| QUERY                                    | RESPONSE   |
|----|----|
| SELECT name FROM employees LIMIT 1       | John Smith |
| SELECT age FROM employees WHERE id = 1   | 35         |
| SELECT COUNT(*) FROM orders              | 5          |
| SELECT product_name FROM products WHERE price > 50 LIMIT 1 | "Widget" |
| SELECT orders.order_id, customers.customer_name FROM orders INNER JOIN customers ON orders.customer_id = customers.customer_id | 1, "John Smith" |
| SELECT employees.employee_name, departments.department_name FROM employees LEFT JOIN departments ON employees.department_id = departments.department_id | "John Smith", "Sales" |
| SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department | "Sales", 50000 |
| SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department HAVING AVG(salary) > 50000 | "Sales", 60000 |
| SELECT product_name, price FROM products ORDER BY price DESC | "Widget", 100 |
| SELECT department, COUNT(*) as employee_count FROM employees GROUP BY department ORDER BY employee_count DESC | "Sales", 3 |

```gherkin
Scenario: RDMS-T004 Default local accounts used to access RDMS instance
    Given an RDMS Instance
    And local User/PW authentication
    And unauthenticated attacker with network access
    When attacker attempts access with default account and password combination "<USER>" "<PASSWORD>"
    And is successful
    Then Initial Access - T1078 Valid Accounts
    And loss of RDMS confidentiality, integrity and availability 
```

Examples:

> These are largely random at present, and should be refined further

|USER                               | PASSWORD  |
|---|--|
|postgres     |postgres     |
|postgres     |password     |
|postgres     |admin        |
|admin        |admin        |
|admin        |password     |

## Execution

### T1651 Cloud Administration Command

### T1059 Command and Scripting Interpreter

```gherkin
Scenario: RDMS-T003 SQL Injection Attack
    Given RDMS
    And CCC-RDMS-1 SQL Support
    When the following query is executed "<QUERY>"
    And system returns an expected value: "<RESPONSE>"
    Then Execution - T1059 Command and Scripting Interpreter
    And loss of RDMS confidentiality, integrity and availability 

```

Examples:

> These are largely random at present, and should be refined further

| QUERY                                    | RESPONSE   |
|---|--|
| TBC                                      | TBC        |

### T1648 Serverless Execution

N/A

### T1204 User Execution

## Persistence

### T1098 Account Manipulation

### T1136 Create Account

> Consider a privileged insider creating other local DB user accounts without authentication.

### T1546 Event Triggered Execution

### T1525 Implant Internal Image

> RDS Custom allows customers to define custom OS/Host configuration- consider a threat involving a compromised AMI
### T1556 Modify Authentication Process

### T1078 Valid Accounts

> Consider privileged insider creates local DB accounts to obtain persistent access

## Privilege Escalation

### T1548 Abuse Elevation Control Mechanism

### T1098 Account Manipulation

### T1546 Event Triggered Execution

### T1078 Valid Accounts

## Defense Evasion

### T1548 Abuse Elevation Control Mechanism

### T1211 Exploitation for Defense Evasion

### T1562 Impair Defenses

```gherkin
 Scenario: RDMS-T005 Attacker disables logs
    Given An RDMS instance
    And CCC-RDMS-10 Ensure the system supports logging
    When a "<THREAT ACTOR>" requests disabling of logging
    And request is successful
    Then Defense Evasion - T1562.008 Impair Defenses: Disable or Modify Cloud logs
    And loss of non repudiation
```

### T1556 Modify Authentication Process

### T1578 Modify Cloud Compute Infrastructure

### T1535 Unsupported Cloud Regions

### T1550 Use Alternate Authentication Material

### T1078 Valid Accounts

## Credential Access

### T1110 Brute Force

```gherkin
Scenario: RDMS-T006 Password Brute Force Attacks
    Given an RDMS Instance
    And Local User/PW authentication
    When an unauthenticated internet attacker executes a password spraying attack
    And is successful
    Then Credential Access - T1110 Brute Force
    And loss of RDMS confidentiality, integrity and availability
```

### T1555 Credentials from Password Stores

### T1606 Forge Web Credentials (2)

### T1556 Modify Authentication Process (2)

### T1621 Multi-Factor Authentication Request Generation

### T1040 Network Sniffing

```gherkin
Scenario: RDMS-T007 Unencrypted RDMS traffic is intercepted
    Given An RDMS Instance
    When a "<THREAT ACTOR>" sniffs DB network traffic
    And plaintext traffic reveals credentials and data
    Then Credential Access - T1040 Network Sniffing
    And Loss of RDMS confidentiality, integrity and availability
```

### T1552 Unsecured Credentials

## Discovery

### T1087 Account Discovery (1)

### T1580 Cloud Infrastructure Discovery

### T1538 Cloud Service Dashboard

### T1526 Cloud Service Discovery

### T1619 Cloud Storage Object Discovery

### T1654 Log Enumeration

### T1046 Network Service Discovery

### T1040 Network Sniffing

### T1201 Password Policy Discovery

### T1069 Permission Groups Discovery

### T1518 Software Discovery

### T1082 System Information Discovery

### T1614 System Location Discovery

### T1016 System Network Connections Discovery

## Lateral Movement

### T1428 Exploitation of Remote Services

### T1458 Replication Through Removable Media

## Collection

### T1119 Automated Collection

### T1530 Data from Cloud Storage

### T1213 Data from Information Repositories

### T1074 Data Staged

## Exfiltration

### T1048 Exfiltration Over Alternative Protocol

### T1537 Transfer Data to Cloud Account

```gherkin
Scenario: RDMS-T008 Backup to adversary controlled cloud account
    Given An RDMS Instance
    And CCC-RDMS-5  Automated Backups
    When a "<THREAT ACTOR>" requests an on demand backup/snapshot
    And the backup destination is in a cloud storage resource outside of the organisations control
    And the request is successful
    Then Exfiltration - T1537 Transfer Data to Cloud Account
    and loss of RDMS confidentiality
```

## Impact

### T1485 Data Destruction

```gherkin
Scenario: RDMS-T012 DB encryption keys destroyed
    Given RDMS Instance
    And CCC-RDMS-7 Encryption at Rest
    When a "<THREAT ACTOR>" requests deletion of DB encryption keys 
    And the request is successful
    Then Impact - T1485 Data Destruction
    and loss of RDMS availability
```

> Also Privileged user deletes RDMS
### T1486 Data Encrypted for Impact

```gherkin
Scenario: RDMS encrypted by adversary (ransomware)
    Given RDMS Instance
    And CCC-RDMS-7 Encryption at Rest is not enabled
    When a "<THREAT ACTOR>" requests encryption of DB instance with imported key material
    And the request is successful
    Then Threat actor requests revocation of cloud provider access to key material
    And the request is successful
    Then Impact - T1486 Data Encrypted for Impact
    And loss of RDMS availability
```

### T1491 Defacement

### T1499 Endpoint Denial of Service

### T1490 Inhibit System Recovery

```gherkin
Scenario: RDMS-T009 Delete RDMS backups
    Given RDMS Instance
    And CCC-RDMS-5  Automated Backups
    When a "<THREAT ACTOR>" requests deletion of backup 
    And the request is successful
    Then Impact - T1490 Inhibit System Recovery
    And loss of RDMS backup availability

Scenario: RDMS-T010 Disable RDMS backups
    Given RDMS Instance
    And CCC-RDMS-5  Automated Backups
    When a "<THREAT ACTOR>" requests disable of automated backup 
    And the request is successful
    Then Impact - T1490 Inhibit System Recovery
    And loss of RDMS backup availability

Scenario: RDMS-T011 Remove backup access to encryption keys
    Given RDMS Instance
    And CCC-RDMS-5  Automated Backups
    When a "<THREAT ACTOR>" requests revocation of backup access to Encryption Keys
    And the request is successful
    Then Impact - T1490 Inhibit System Recovery
    And loss of RDMS backup availability

```

### T1498 Network Denial of Service 

### T1496 Resource Hijacking
