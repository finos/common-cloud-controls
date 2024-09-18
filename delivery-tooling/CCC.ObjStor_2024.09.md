# CCC.ObjStor v2024.09 (Object Storage)

Object storage is a data storage architecture that manages data as objects,
rather than as files or blocks. Each object contains the data itself,
metadata, and a unique identifier, making it ideal for storing large amounts
of unstructured data such as multimedia files, backups, and archives. It is
highly scalable and often used in cloud environments due to its flexibility
and accessibility.

---

## Release Notes

> _Initial release_

Release Manager - **Damien Burks, Citi** (damienjburks)

### Changes Since Last Release

- Test
- Test

## Features

|Feature ID|Feature Title|
|----|----|
|CCC.F01|Encryption in Transit Enabled by Default|
|CCC.F02|Encryption at Rest Enabled by Default|
|CCC.F03|Access Logs|
|CCC.F04|Transaction Rate Limits|
|CCC.F05|Signed URLs|
|CCC.F06|Identity Based Access Control|
|CCC.F07|Event Notifications|
|CCC.F08|Multi-zone Deployability|
|CCC.F09|Monitoring|
|CCC.F10|Logging|
|CCC.F11|Backup|
|CCC.F12|Recovery|
|CCC.F13|Infrastructure as Code|
|CCC.F14|API Access|
|CCC.F15|Cost Management|
|CCC.F16|Budgeting|
|CCC.F17|Alerting|
|CCC.F18|Versioning|
|CCC.ObjStor.F01|Storage Buckets|
|CCC.ObjStor.F02|Storage Objects|
|CCC.ObjStor.F03|Bucket Capacity Limit|
|CCC.ObjStor.F04|Object Size Limit|
|CCC.ObjStor.F05|Object Storage Replication|
|CCC.ObjStor.F06|Querying|
|CCC.ObjStor.F07|Storage Classes|
|CCC.ObjStor.F08|Lifecycle Policies|
|CCC.ObjStor.F09|Object Versioning|
|CCC.ObjStor.F10|Object Modification Locks|
|CCC.ObjStor.F11|Object Level Access Control|

---

### CCC.F01 - Encryption in Transit Enabled by Default

Supports encrypting data in transit using SSL/TLS.

### CCC.F02 - Encryption at Rest Enabled by Default

Provides default encryption of data before storage, with the option for
clients to maintain control over the encryption keys.

### CCC.F03 - Access Logs

Provides users with the ability to track all requests made to resources.

### CCC.F04 - Transaction Rate Limits

Allows the setting of a threshold where industry-standard throughput is
achieved up to the specified rate limit.

### CCC.F05 - Signed URLs

Provides the ability to grant temporary or restricted access
to a resource through a custom URL that contains authentication information.

### CCC.F06 - Identity Based Access Control

Provides the ability to determine access to resources based on
attributes associated with a user identity.

### CCC.F07 - Event Notifications

Publishes events for creation, deletion, and modification of
objects in a way that enables users to trigger actions in response.

### CCC.F08 - Multi-zone Deployability

Providing the ability for the service to be deployed in multiple availability
zones within a region to increase availability and fault tolerance.

### CCC.F09 - Monitoring

Providing the ability to continuously observe, track, and analyze
the performance, availability, and health of the service resources or applications.

### CCC.F10 - Logging

Providing the ability to transmit system events, application activities, and/or
user interactions to a logging service

### CCC.F11 - Backup

Providing the ability to create copies of associated data or configurations in the form of automated backups,
snapshot-based backups, and/or incremental backups.

### CCC.F12 - Recovery

Providing the ability to restore data, a system, or an application to a functional state
after an incident such as data loss, corruption or a disaster.

### CCC.F13 - Infrastructure as Code

Allows for managing and provisioning service resources through machine-readable configuration files, such as templates.

### CCC.F14 - API Access

Allowing users to interact programmatically with the service and its resources using APIs, SDKs and CLI.

### CCC.F15 - Cost Management

Providing the ability to filter spending and to detect cost anomalies by the service.

### CCC.F16 - Budgeting

Providing the ability to trigger alerts when spending thresholds are approached or exceeded for the service.

### CCC.F17 - Alerting

Providing the ability to set an alarm based on performance metrics, logs, events or spending thresholds of the service.

### CCC.F18 - Versioning

Providing the ability to maintain multiple versions of the same resource.

### CCC.ObjStor.F01 - Storage Buckets

Provides uniquely identifiable segmentations in which data
elements may be stored.

### CCC.ObjStor.F02 - Storage Objects

Supports storing, accessing, and managing data elements which contain
both data and metadata.

### CCC.ObjStor.F03 - Bucket Capacity Limit

Provides the ability to set a maximum total capacity for objects within
a bucket.

### CCC.ObjStor.F04 - Object Size Limit

Supports setting a maximum object size for storing objects.

### CCC.ObjStor.F05 - Object Storage Replication

Supports replicating objects across multiple regions or availability zones
to ensure high availability and durability.

### CCC.ObjStor.F06 - Querying

Supports performing simple select queries to retrieve only a subset of
objects from the bucket.

### CCC.ObjStor.F07 - Storage Classes

Provides different storage classes for frequently and infrequently
accessed objects.

### CCC.ObjStor.F08 - Lifecycle Policies

Supports defining policies to automate data management tasks.

### CCC.ObjStor.F09 - Object Versioning

Provides the ability to keep multiple versions of an object in the same
bucket.

### CCC.ObjStor.F10 - Object Modification Locks

Allows locking of objects to disable modification and/or deletion of an
object for a defined period of time.

### CCC.ObjStor.F11 - Object Level Access Control

Supports controlling access to specific objects within the object store.


## Threats

|Threat ID|Threat Title|
|----|----|
|CCC.TH01|Unauthorized access through elevated privileges|
|CCC.TH02|Vendor-hosted keys are compromised|
|CCC.TH03|Attacker intercepts data in transit|
|CCC.TH04|Attacker encrypts data with client-managed keys|
|CCC.TH05|Actors in known dangerous regions attempt to access data|

---

### CCC.TH01 - Unauthorized access through elevated privileges

**Description:** An attacker can exploit misconfigured access controls to gain
unauthorized access to sensitive resources by granting excessive privileges.


**Related Features:**

  - CCC.F06

**Related MITRE ATT&CK Values:**

  - TA0005
  - T1562

### CCC.TH02 - Vendor-hosted keys are compromised

**Description:** The service uses a vendor-hosted key management service (KMS) to manage
encryption keys. Insider threats or mistakes can result in access by a
threat actor.


**Related Features:**

  - CCC.F01
  - CCC.F02

**Related MITRE ATT&CK Values:**

  - TA0006
  - T1556.006

### CCC.TH03 - Attacker intercepts data in transit

**Description:** The service allows unencrypted communication (e.g., HTTP). An attacker
can intercept traffic between clients and the service to read or modify
the data during transmission.


**Related Features:**


**Related MITRE ATT&CK Values:**

  - TA009
  - T1557

### CCC.TH04 - Attacker encrypts data with client-managed keys

**Description:** The service provides encryption mechanisms, but the encryption keys are
managed by the client. An attacker with access to the service can encrypt
the data, rendering it inaccessible without the decryption key they hold.
Additionally, an attacker may alter the encryption key management settings
to prevent access to data.


**Related Features:**

  - CCC.F01
  - CCC.F02

**Related MITRE ATT&CK Values:**

  - TA0040
  - T1486

### CCC.TH05 - Actors in known dangerous regions attempt to access data

**Description:** The service is deployed in a region with known geopolitical risks. An
attacker in that region may attempt to access the resource by exploiting
privileged network access or other vulnerabilities.


**Related Features:**


**Related MITRE ATT&CK Values:**

  - TA0042
  - T1583


## Controls

|Control ID|Control Title|
|----|----|
|CCC.C01|Prevent unencrypted requests|
|CCC.C02|Ensure data encryption at rest for all stored data|
|CCC.C03|Implement multi-factor authentication (MFA) for access|
|CCC.C04|Log all access and changes|
|CCC.C05|Prevent access from untrusted entities|
|CCC.C06|Prevent deployment in restricted regions|
|CCC.ObjStor.C01|Prevent Requests to Buckets or Objects with Untrusted KMS Keys|

---

### CCC.C01 - Prevent unencrypted requests

**Objective:** Ensure that all communications are encrypted in transit to protect data
integrity and confidentiality.


**Control Family:** Data

**NIST CSF:** PR.DS-2

**Mitigated Threats:**


**Control Mappings:**

  - CCM IVS-09
  - CCM DSI-03
  - ISO_27001 2013 A.13.1.1
  - NIST_800_53 SC-8
  - NIST_800_53 SC-13

### CCC.C02 - Ensure data encryption at rest for all stored data

**Objective:** Ensure that all data stored is encrypted at rest to maintain
confidentiality and integrity.


**Control Family:** Encryption

**NIST CSF:** PR.DS-1

**Mitigated Threats:**


**Control Mappings:**

  - CCM DSI-01
  - CCM DSI-02
  - ISO_27001 2013 A.10.1.1
  - NIST_800_53 SC-28

### CCC.C03 - Implement multi-factor authentication (MFA) for access

**Objective:** Ensure that all human user access requires multi-factor authentication
(MFA), minimizing the risk of unauthorized access by enforcing strong
authentication mechanisms.


**Control Family:** Identity and Access Management

**NIST CSF:** PR.AC-7

**Mitigated Threats:**


**Control Mappings:**

  - CCM IAM-03
  - CCM IAM-08
  - ISO_27001 2013 A.9.4.2
  - NIST_800_53 IA-2

### CCC.C04 - Log all access and changes

**Objective:** Ensure that all access and changes are logged to maintain a detailed
audit trail for security and compliance purposes.


**Control Family:** Logging &amp; Monitoring

**NIST CSF:** DE.AE-3

**Mitigated Threats:**


**Control Mappings:**

  - CCM DSI-06
  - CCM STA-04
  - ISO_27001 2013 A.12.4.1
  - NIST_800_53 AU-2
  - NIST_800_53 AU-3

### CCC.C05 - Prevent access from untrusted entities

**Objective:** Ensure secure access controls prevent unauthorized data access,
exfiltration, and misuse of legitimate services by adversaries.


**Control Family:** Identity and Access Management

**NIST CSF:** PR.AC-3

**Mitigated Threats:**


**Control Mappings:**

  - CCM DS-5
  - ISO_27001 2013 A.13.1.3
  - NIST_800_53 AC-3

### CCC.C06 - Prevent deployment in restricted regions

**Objective:** Ensure that resources are not provisioned or deployed in geographic
regions or cloud availability zones that have been designated as
restricted or prohibited, to comply with regulatory requirements and
reduce exposure to geopolitical risks.


**Control Family:** Data

**NIST CSF:** 

**Mitigated Threats:**

  - CCC.TH05

**Control Mappings:**

  - CCM DSI-06
  - CCM DSI-08
  - ISO_27001 2013 A.11.1.1
  - NIST_800_53 AC-6

### CCC.ObjStor.C01 - Prevent Requests to Buckets or Objects with Untrusted KMS Keys

**Objective:** Prevent any requests to object storage buckets or objects using untrusted
KMS keys to protect against unauthorized data encryption that can impact
data availability and integrity.


**Control Family:** Data

**NIST CSF:** PR.DS-4

**Mitigated Threats:**

  - CCC.TH01
  - CCC.TH02
  - CCC.TH03

**Control Mappings:**

  - CCM DSI-04
  - CCM DSI-05
  - ISO_27001 2013 A.12.3.1
  - NIST_800_53 CP-6
  - NIST_800_53 CP-9
