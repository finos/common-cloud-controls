# CCC.RDMS: Relational Database Management Systems Controls

| Control Id  | Service Taxonomy Id | Control                                       |
| ----------- | ------------------- | --------------------------------------------- |
| CCC.RDMS.C1 | CCC-RDMS-9          | Enforce Role-Based Access Control             |
| CCC.RDMS.C2 | CCC-RDMS-9          | Disable Access with Default Credentials       |
| CCC.RDMS.C3 | CCC-RDMS-5          | Restrict Snapshot Collection To Trusted Roles |
| CCC.RDMS.C4 | CCC-RDMS-11         | Enforce Logging & Monitoring                  |

---

## CCC.RDMS.C1: Enforce Role-Based Access Control

- Corresponding Feature: CCC-RDMS-9 (Role Based Access Control)
- NIST CSF: Protect (PR.AC-1)
- MITRE ATT&CK TTP: [M1041 - Restrict User Privileges](https://attack.mitre.org/mitigations/M1041)

### Objective

Ensure only authorized roles can access database resources.

### Control Mappings

- CCM: IAM-02, IAM-12
- ISO/IEC 27001:2013 A.9.1.2
- NIST SP 800-53: AC-2

### Testing Requirements

The following validations must be performed against corresponding Control Implementation capabilities to ensure the Control Objective is thoroughly assessed:

1. [**CCC.RDMS.C1.TR01**](./tests/ccc-rdms-c1.feature#CCC.RDMS.C1.TR01): Role-based access control for database management system
2. [**CCC.RDMS.C1.TR02**](./tests/ccc-rdms-c1.feature#CCC.RDMS.C1.TR02): Restrict access to database resources based on role definitions
3. [**CCC.RDMS.C1.TR03**](./tests/ccc-rdms-c1.feature#CCC.RDMS.C1.TR03): Prevent unauthorized access to database resources

---

## CCC.RDMS.C2: Disable Access with Default Credentials

- Corresponding Feature: CCC-RDMS-9 (Role Based Access Control)
- NIST CSF: Protect (PR.AC-5)
- MITRE ATT&CK TTP: [M1041 - Restrict User Privileges](https://attack.mitre.org/mitigations/M1041)

### Objective

Ensure that default credentials are disabled and only authorized roles can access database resources.

### Control Mappings

- CCM: IAM-09, IAM-13
- ISO/IEC 27001:2013 A.9.2.6
- NIST SP 800-53: AC-17

### Testing Requirements

The following validations must be performed against corresponding Control Implementation capabilities to ensure the Control Objective is thoroughly assessed:

1. [**CCC.RDMS.C2.TR01**](./tests/ccc-rdms-c2.feature#CCC.RDMS.C2.TR01): Secure Database Access Control

---

## CCC.RDMS.C3: Restrict Snapshot Collection To Trusted Roles

- Corresponding Feature: CCC-RDMS-5 (Automated Backups)
- NIST CSF: Protect (PR.DS-3)
- MITRE ATT&CK TTP: [M1054 - Restrict Data Access](https://attack.mitre.org/mitigations/M1054)

### Objective

Limit snapshot collection capabilities to trusted roles.

### Control Mappings

- CCM: DSI-05, DSI-07
- ISO/IEC 27001:2013 A.12.3.1
- NIST SP 800-53: CP-9

### Testing Requirements

The following validations must be performed against corresponding Control Implementation capabilities to ensure the Control Objective is thoroughly assessed:

1. [**CCC.RDMS.C3.TR01**](./tests/ccc-rdms-c3.feature#CCC.RDMS.C3.TR01): Snapshot collection by trusted roles
2. [**CCC.RDMS.C3.TR02**](./tests/ccc-rdms-c3.feature#CCC.RDMS.C3.TR02): Restriction of snapshot collection capabilities
3. [**CCC.RDMS.C3.TR03**](./tests/ccc-rdms-c3.feature#CCC.RDMS.C3.TR03): Prevent unauthorized snapshot collection

---

## CCC.RDMS.C4: Enforce Logging & Monitoring

- Corresponding Feature: CCC-RDMS-11 (Monitoring)
- NIST CSF: Protect (PR.PT-1)
- MITRE ATT&CK TTP: [M1030 - Network Intrusion Detection](https://attack.mitre.org/mitigations/M1030)

### Objective

Ensure logging and monitoring cannot be disabled by users.

### Control Mappings

- CCM: STA-04, STA-05
- ISO/IEC 27001:2013 A.12.4.1
- NIST SP 800-53: AU-2, AU-3

### Testing Requirements

The following validations must be performed against corresponding Control Implementation capabilities to ensure the Control Objective is thoroughly assessed:

1. [**CCC.RDMS.C4.TR01**](./tests/ccc-rdms-c4.feature#CCC.RDMS.C5.TR01): Enable logging for database activities
2. [**CCC.RDMS.C4.TR02**](./tests/ccc-rdms-c4.feature#CCC.RDMS.C5.TR02): Active monitoring of database resources
3. [**CCC.RDMS.C4.TR03**](./tests/ccc-rdms-c4.feature#CCC.RDMS.C5.TR03): Restrict users from disabling logging and monitoring
