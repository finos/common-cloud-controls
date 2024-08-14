# CCC.OS: Object Storage

| Control Id | Service Taxonomy Id | Control                                                                        |
| ---------- | ------------------- | ------------------------------------------------------------------------------ |
| CCC.OS.C1  | CCC-020115          | Prevent unencrypted requests to object storage bucket                          |
| CCC.OS.C2  | CCC-020114          | Ensure data encryption at rest                                                 |
| CCC.OS.C3  | CCC-020116          | Implement multi-factor authentication (MFA) for access                         |
| CCC.OS.C4  | CCC-020112          | Maintain immutable backups of data                                             |
| CCC.OS.C5  | CCC-020118          | Log all access and changes to object storage bucket                            |
| CCC.OS.C6  | CCC-020118          | Prevent access to object storage from trusted cloud tenants and cloud services |
| CCC.OS.C7  | CCC-020118          | Prevent deploying object storage in restricted regions                         |

---

## CCC.OS.C1: Prevent unencrypted requests to object storage bucket

- Corresponding Feature: CCC-020115 (Encryption in Transit)
- NIST CSF: Protect (PR.DS-2)
- MITRE ATT&CK TTP: T1573 - Encrypted Channels

### Objective

Prevent any unencrypted requests to the object storage bucket, ensuring that all communications are encrypted in transit to protect data integrity and confidentiality.

### Control Mappings

- CCM: IVS-09, DSI-03
- ISO/IEC 27001:2013 A.13.1.1
- NIST SP 800-53: SC-8, SC-13

### Testing Requirements

The following validations must be performed against corresponding Control Implementation capabilities to ensure the Control Objective is thoroughly assessed:

1. [**CCC.OS.C1.TR01**](./tests/ccc-os-c1.feature#CCC.OS.C1.TR01): All supported network data protocols must be running on secure channels.
2. [**CCC.OS.C1.TR02**](./tests/ccc-os-c1.feature#CCC.OS.C1.TR02): All clear text channels should be disabled.
3. [**CCC.OS.C1.TR03**](./tests/ccc-os-c1.feature#CCC.OS.C1.TR03): The cipher suite implemented for ensuring the integrity and confidentiality of data should conform with the latest suggested cipher suites. [NIST proposed latest standard cipher suites](<[#](https://csrc.nist.gov/pubs/sp/800/52/r2/final)>).

---

## CCC.OS.C2: Ensure data encryption at rest

- Corresponding Feature: CCC-020114 (Encryption at Rest)
- NIST CSF: Protect (PR.DS-1)
- MITRE ATT&CK TTP: [T1486 - Data Encrypted for Impact](https://attack.mitre.org/techniques/T1486/)

### Objective

Ensure that all data stored within the object storage service is encrypted at rest to maintain confidentiality and integrity.

### Control Mappings

- CCM: DSI-01, DSI-02
- ISO/IEC 27001:2013 A.10.1.1
- NIST SP 800-53: SC-28

### Testing Requirements

The following validations must be performed against corresponding Control Implementation capabilities to ensure the Control Objective is thoroughly assessed:

1. **CCC.OS.C2.TR.01** {#CCC.OS.C2.TR.01}: Verify that data stored in the object storage bucket is encrypted using industry-standard algorithms.
2. **CCC.OS.C2.TR.02** {#CCC.OS.C2.TR.02}: Ensure that encryption keys are managed securely and rotated periodically.
3. **CCC.OS.C2.TR.03** {#CCC.OS.C2.TR.03}: Confirm that decryption is only possible through authorized access mechanisms.

---

## CCC.OS.C3: Implement multi-factor authentication (MFA) for access

- Corresponding Feature: CCC-020116 (Identity Based Access Control)
- NIST CSF: Protect (PR.AC-7)
- MITRE ATT&CK TTP: [T1078 - Valid Accounts](https://attack.mitre.org/techniques/T1078/)

### Objective

Ensure that all human user access to object storage buckets requires multi-factor authentication (MFA), minimizing the risk of unauthorized access by enforcing strong authentication mechanisms.

### Control Mappings

- CCM: IAM-03, IAM-08
- ISO/IEC 27001:2013 A.9.4.2
- NIST SP 800-53: IA-2

### Testing Requirements

The following validations must be performed against corresponding Control Implementation capabilities to ensure the Control Objective is thoroughly assessed:

1. [**CCC.OS.C3.TR01**](./tests/ccc-os-c3.feature#CCC.OS.C3.TR01): Verify that MFA is enforced for all access attempts to the object storage bucket.
2. [**CCC.OS.C3.TR02**](./tests/ccc-os-c3.feature#CCC.OS.C3.TR02): Ensure that MFA is required for all administrative access to the storage management interface.
3. [**CCC.OS.C3.TR03**](./tests/ccc-os-c3.feature#CCC.OS.C3.TR03): Confirm that users are unable to access the object storage bucket without completing MFA.

---

## CCC.OS.C4: Maintain immutable backups of data

- Corresponding Feature: CCC-020112 (Compliance and Governance)
- NIST CSF: Protect (PR.DS-1)
- MITRE ATT&CK TTP: [T1485 - Data Destruction](https://attack.mitre.org/techniques/T1485/)

### Objective

Ensure that data stored in the object storage bucket is immutable for a defined period, preventing unauthorized modifications or deletions and thereby mitigating data destruction.

### Control Mappings

- CCM: DSI-05, DSI-07
- ISO/IEC 27001:2013 A.12.3.1
- NIST SP 800-53: CP-9

### Testing Requirements

The following validations must be performed against corresponding Control Implementation capabilities to ensure the Control Objective is thoroughly assessed:

1. **CCC.OS.C4.TR.01** {#CCC.OS.C4.TR.01}: Verify that data in the object storage bucket is protected by immutability settings.
2. **CCC.OS.C4.TR.02** {#CCC.OS.C4.TR.02}: Ensure that attempts to modify or delete data within the immutability period are denied.
3. **CCC.OS.C4.TR.03** {#CCC.OS.C4.TR.03}: Confirm that immutable data remains unchanged throughout the defined retention period.

---

## CCC.OS.C5: Log all access and changes to object storage

- Corresponding Feature: CCC-020118 (Logging)
- NIST CSF: Detect (DE.AE-3)
- MITRE ATT&CK TTP: [T1530: Data from Cloud Storage Object](https://attack.mitre.org/techniques/T1530)

### Objective

Ensure that all access and changes to the object storage bucket are logged to maintain a detailed audit trail for security and compliance purposes.

### Control Mappings

- CCM: DSI-06, STA-04
- ISO/IEC 27001:2013 A.12.4.1
- NIST SP 800-53: AU-2, AU-3

### Testing Requirements

The following validations must be performed against corresponding Control Implementation capabilities to ensure the Control Objective is thoroughly assessed:

1. **CCC.OS.C5.TR.01** {#CCC.OS.C5.TR.01}: Verify that all access attempts to the object storage bucket are logged.
2. **CCC.OS.C5.TR.02** {#CCC.OS.C5.TR.02}: Ensure that all changes to the object storage bucket configurations are logged.
3. **CCC.OS.C5.TR.03** {#CCC.OS.C5.TR.03}: Confirm that logs are protected against unauthorized access and tampering.

## CCC.OS.C6: Prevent access to object storage from trusted cloud tenants and cloud services

### Objective

Ensure secure management of access to object storage resources, preventing unauthorized data access, exfiltration, and misuse of legitimate services by adversaries.

### Control Mappings

- NIST CSF: PR.PT-3: Remote access is managed.
- NIST CSF: PR.PT-4: Communications and control networks are protected.
- MITRE ATT&CK Remote Services (T1021)
- CSA-CCM DS-5: Data Loss Prevention - Implement controls to prevent the unauthorized exfiltration of sensitive data.

### Testing Requirements

The following validations must be performed against corresponding Control Implementation capabilities to ensure the Control Objective is thoroughly assessed:

1. **CCC.OS.C6.TR.01** {#CCC.OS.C6.TR.01}: Verify that object storage endpoint can be blocked from public access.
2. **CCC.OS.C6.TR.02** {#CCC.OS.C6.TR.02}: Verify that object storage can be blocked from cloud services deployed on the same cloud tenant.
3. **CCC.OS.C6.TR.03** {#CCC.OS.C6.TR.03}: Confirm that it's possible to prevent access to object storage from other cloud tenants, even if those tenants have network connectivity to the cloud tenant hosting the object storage.

## CCC.OS.C7: Prevent deploying object storage in restricted regions

### Objective

Ensure that object storage resources are not provisioned or deployed in geographic regions or cloud availability zones that have been designated as restricted or prohibited

### Control Mappings

- NIST CSF: PR.AC-3 Access Control Policy
- NIST CSF: PR.DS-5 Data Location and Protection
- NIST CSF: RS.AN-3 Security Analysis
- MITRE ATT&CK Cloud Accounts (T1583)

### Testing Requirements

The following validations must be performed against corresponding Control Implementation capabilities to ensure the Control Objective is thoroughly assessed:

1. **CCC.OS.C7.TR.01** {#CCC.OS.C7.TR.01}: Verify that object storage are not deployed in any of the restricted regions and zones.
2. **CCC.OS.C7.TR.02** {#CCC.OS.C7.TR.02}: Verify that object storage cannot be deployed in any of the restricted regions and zones.
3. **CCC.OS.C7.TR.03** {#CCC.OS.C7.TR.03}: Verify that object storage cannot be backedup or copied to any of the restriced regions and zones.
