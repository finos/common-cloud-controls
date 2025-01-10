# CCC.ObjStor v2025.01 (Object Storage)

<img height="250px" src="https://raw.githubusercontent.com/finos/branding/882d52260eb9b85a4097db38b09a52ea9bb68734/project-logos/active-project-logos/Common%20Cloud%20Controls%20Logo/Horizontal/2023_FinosCCC_Horizontal_BLK.svg" alt="CCC Logo"/>

Object storage is a data storage architecture that manages data as objects,
rather than as files or blocks. Each object contains the data itself,
metadata, and a unique identifier, making it ideal for storing large amounts
of unstructured data such as multimedia files, backups, and archives. It is
highly scalable and often used in cloud environments due to its flexibility
and accessibility.

## Release Notes

> This initial release is part of the first batch of control catalogs
> produced by the CCC. It is the result of thousands of hours dedicated to
> exploring different ways of working and collaborating, on top of time
> spent researching, writing, and reviewing the content. This marks a huge
> milestone for the CCC and the broader community as further releases will
> continue to build on this foundation. A huge thanks to everyone who has
> brought us to this point!

Release Manager - **Damien Burks, Citi** ([damienjburks](https://github.com/damienjburks))

## Changes Since Last Release

- This initial release contains a variety of commits designed to capture
  all of the features, threats, and controls for this service category.

## Features

| Feature ID      | Feature Title                            |
| --------------- | ---------------------------------------- |
| CCC.F01         | Encryption in Transit Enabled by Default |
| CCC.F02         | Encryption at Rest Enabled by Default    |
| CCC.F03         | Access/Activity Logs                     |
| CCC.F04         | Transaction Rate Limits                  |
| CCC.F05         | Signed URLs                              |
| CCC.F06         | Identity Based Access Control            |
| CCC.F07         | Event Notifications                      |
| CCC.F08         | Multi-zone Deployment                    |
| CCC.F09         | Monitoring                               |
| CCC.F10         | Logging                                  |
| CCC.F11         | Backup                                   |
| CCC.F12         | Recovery                                 |
| CCC.F13         | Infrastructure as Code                   |
| CCC.F14         | API Access                               |
| CCC.F15         | Cost Management                          |
| CCC.F16         | Budgeting                                |
| CCC.F17         | Alerting                                 |
| CCC.F18         | Versioning                               |
| CCC.F19         | On-demand Scaling                        |
| CCC.F20         | Tagging                                  |
| CCC.F21         | Replication                              |
| CCC.F22         | Location Lock-In                         |
| CCC.F23         | Network Access Rules                     |
| CCC.ObjStor.F01 | Storage Buckets                          |
| CCC.ObjStor.F02 | Storage Objects                          |
| CCC.ObjStor.F03 | Bucket Capacity Limit                    |
| CCC.ObjStor.F04 | Object Size Limit                        |
| CCC.ObjStor.F05 | Store New Objects                        |
| CCC.ObjStor.F06 | Replace Stored Objects                   |
| CCC.ObjStor.F07 | Delete Stored Objects                    |
| CCC.ObjStor.F08 | Lifecycle Policies                       |
| CCC.ObjStor.F09 | Object Modification Locks                |
| CCC.ObjStor.F10 | Object Level Access Control              |
| CCC.ObjStor.F11 | Querying                                 |
| CCC.ObjStor.F12 | Storage Classes                          |

---

### CCC.F01 - Encryption in Transit Enabled by Default

Provides default encryption of data in transit through SSL or TLS.

### CCC.F02 - Encryption at Rest Enabled by Default

Provides default encryption of data before storage, with the option for
clients to maintain control over the encryption keys.

### CCC.F03 - Access/Activity Logs

Provides users with the ability to track all requests made to or
activities performed on resources for audit purposes.

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

### CCC.F08 - Multi-zone Deployment

Provides the ability for the service to be deployed in multiple availability
zones or regions to increase availability and fault tolerance.

### CCC.F09 - Monitoring

Provides the ability to continuously observe, track, and analyze
the performance, availability, and health of the service resources or
applications.

### CCC.F10 - Logging

Provides the ability to transmit system events, application activities,
and/or user interactions to a logging service

### CCC.F11 - Backup

Provides the ability to create copies of associated data or
configurations in the form of automated backups, snapshot-based backups,
and/or incremental backups.

### CCC.F12 - Recovery

Provides the ability to restore data, a system, or an application to a functional state
after an incident such as data loss, corruption or a disaster.

### CCC.F13 - Infrastructure as Code

Allows for managing and provisioning service resources
through machine-readable configuration files, such as templates.

### CCC.F14 - API Access

Allows users to interact programmatically with the service and its resources using APIs, SDKs and CLI.

### CCC.F15 - Cost Management

Provides the ability to filter spending and to detect cost anomalies for the service.

### CCC.F16 - Budgeting

Provides the ability to trigger alerts when spending thresholds are approached or exceeded for the service.

### CCC.F17 - Alerting

Provides the ability to set an alarm based on performance metrics,
logs, events or spending thresholds of the service.

### CCC.F18 - Versioning

Provides the ability to maintain multiple versions of the same resource.

### CCC.F19 - On-demand Scaling

Provide scaling of resources based on demand.

### CCC.F20 - Tagging

Provide the ability to tag a resource to effectively manage and gain insights of the resource.

### CCC.F21 - Replication

Provides the ability to copy data or resource to multiple locations to ensure
availability and durability.

### CCC.F22 - Location Lock-In

Provides the ability to control where the resources are created.

### CCC.F23 - Network Access Rules

Ability to control access to the resource by defining network access rules.

### CCC.ObjStor.F01 - Storage Buckets

Provides uniquely identifiable segmentations in which data elements may
be stored.

### CCC.ObjStor.F02 - Storage Objects

Supports storing, accessing, and managing data elements which contain
both data and metadata.

### CCC.ObjStor.F03 - Bucket Capacity Limit

Provides the ability to set a maximum total capacity for objects within
a bucket.

### CCC.ObjStor.F04 - Object Size Limit

Supports setting a maximum object size for storing objects.

### CCC.ObjStor.F05 - Store New Objects

Supports for storing a new object in the bucket.

### CCC.ObjStor.F06 - Replace Stored Objects

Supports for replacing an object in the bucket with a new object for the same key.

### CCC.ObjStor.F07 - Delete Stored Objects

Supports for deleting objects from the bucket given the object key.

### CCC.ObjStor.F08 - Lifecycle Policies

Supports defining policies to automate data management tasks.

### CCC.ObjStor.F09 - Object Modification Locks

Allows locking of objects to disable modification and/or deletion of an
object for a defined period of time.

### CCC.ObjStor.F10 - Object Level Access Control

Supports controlling access to specific objects within the object store.

### CCC.ObjStor.F11 - Querying

Supports performing simple select queries to retrieve only a subset of
objects from the bucket.

### CCC.ObjStor.F12 - Storage Classes

Provides different storage classes for frequently and infrequently
accessed objects.

## Threats

| Threat ID        | Threat Title                                                   |
| ---------------- | -------------------------------------------------------------- |
| CCC.TH01         | Access Control is Misconfigured                                |
| CCC.TH02         | Data is Intercepted in Transit                                 |
| CCC.TH03         | Deployment Region Network is Untrusted                         |
| CCC.TH04         | Data is Replicated to Untrusted or External Locations          |
| CCC.TH05         | Data is Corrupted During Replication                           |
| CCC.TH06         | Data is Lost or Corrupted                                      |
| CCC.TH07         | Logs are Tampered With or Deleted                              |
| CCC.TH08         | Cost Management Data is Manipulated                            |
| CCC.TH09         | Logs or Monitoring Data are Read by Unauthorized Users         |
| CCC.TH10         | Alerts are Intercepted                                         |
| CCC.TH11         | Event Notifications are Incorrectly Triggered                  |
| CCC.TH12         | Resource Constraints are Exhausted                             |
| CCC.TH13         | Resource Tags are Manipulated                                  |
| CCC.TH14         | Older Resource Versions are Exploited                          |
| CCC.TH15         | Automated Enumeration and Reconnaissance by Non-human Entities |
| CCC.ObjStor.TH01 | Data Exfiltration via Insecure Lifecycle Policies              |
| CCC.ObjStor.TH02 | Improper Enforcement of Object Modification Locks              |

---

### CCC.TH01 - Access Control is Misconfigured

An attacker can exploit misconfigured access controls to grant excessive
privileges or gain unauthorized access to sensitive resources.

**Related Features:**

- CCC.F06

**Related MITRE ATT&CK Values:**

- T1078
- T1548
- T1203
- T1098
- T1484
- T1546
- T1537
- T1567
- T1048
- T1485
- T1565
- T1027

### CCC.TH02 - Data is Intercepted in Transit

In the event that encrypted communication is not properly in effect, an
attacker can intercept traffic between clients and the service to read or
modify the data during transmission.

**Related Features:**

- CCC.F01

**Related MITRE ATT&CK Values:**

- T1557
- T1040

### CCC.TH03 - Deployment Region Network is Untrusted

If any part of the service is deployed in a hostile, unstable, or
insecure location, an attacker may attempt to access the resource or
intercept data by exploiting privileged network access or physical
vulnerabilities.

**Related Features:**

- CCC.F08

**Related MITRE ATT&CK Values:**

- T1040
- T1110
- T1105
- T1583
- T1557

### CCC.TH04 - Data is Replicated to Untrusted or External Locations

An attacker could replicate data to untrusted or external locations if replication configurations
are not properly restricted. This could result in data leakage or exposure to unauthorized entities
outside the organization&#39;s trusted perimeter.

**Related Features:**

- CCC.F21

**Related MITRE ATT&CK Values:**

- T1565

### CCC.TH05 - Data is Corrupted During Replication

Malicious actors may attempt to corrupt, delay, or delete data during
replication processes across multiple regions or availability zones,
affecting the integrity and availability of data.

**Related Features:**

- CCC.F08
- CCC.F12
- CCC.F21

**Related MITRE ATT&CK Values:**

- T1485
- T1565
- T1491
- T1490

### CCC.TH06 - Data is Lost or Corrupted

Data loss or corruption can occur due to accidental deletion,
misconfiguration, or malicious activity. This can result in the loss of
critical data, service disruption, or unauthorized access to sensitive
information.

**Related Features:**

- CCC.F11
- CCC.F18

**Related MITRE ATT&CK Values:**

- T1485
- T1565
- T1491
- T1490

### CCC.TH07 - Logs are Tampered With or Deleted

Attackers may tamper with or delete logs to cover their tracks and evade
detection. This prevents security teams from identifying the full scope
of an attack and may disrupt forensic investigations.

**Related Features:**

- CCC.F03
- CCC.F10

**Related MITRE ATT&CK Values:**

- T1070
- T1565
- T1027

### CCC.TH08 - Cost Management Data is Manipulated

Attackers may manipulate cost management data to hide excessive resource
consumption or to deceive users about resource usage. This could be used
to exhaust budgets, cause financial losses, or evade detection of other attacks.

**Related Features:**

- CCC.F15

**Related MITRE ATT&CK Values:**

- T1565
- T1070

### CCC.TH09 - Logs or Monitoring Data are Read by Unauthorized Users

Unauthorized access to logs or monitoring data can provide attackers with
valuable information about the system&#39;s configuration, operations, and
security mechanisms. This can be used to identify vulnerabilities, plan
attacks, or evade detection.

**Related Features:**

- CCC.F03
- CCC.F09

**Related MITRE ATT&CK Values:**

- T1003
- T1007
- T1018
- T1033
- T1046
- T1057
- T1069
- T1070
- T1082
- T1120
- T1124
- T1497
- T1518

### CCC.TH10 - Alerts are Intercepted

Malicious actors may exploit event notifications to monitor and
intercept information about sensitive operations or access patterns.

**Related Features:**

- CCC.F03
- CCC.F07
- CCC.F09
- CCC.F17

**Related MITRE ATT&CK Values:**

- T1057
- T1049
- T1083

### CCC.TH11 - Event Notifications are Incorrectly Triggered

Malicious actors may exploit event notifications to trigger sensitive
operations or access patterns. Alternately, attackers may flood the
system with notifications to obfuscate another attack or overwhelm the
service to disrupt legitimate operations.

**Related Features:**

- CCC.F07
- CCC.F17

**Related MITRE ATT&CK Values:**

- T1205
- T1001.001
- T1491.001

### CCC.TH12 - Resource Constraints are Exhausted

An attack or misconfiguration can consume all available resources, such
as memory, CPU, or storage, to disrupt the service or deny access to
legitimate users. This can be achieved through repeated requests,
resource-intensive operations, or the lowering of rate/budget limits.
Through auto-scaling, the attacker may also attempt to exhaust
higher-level budget thresholds to impact other systems in the same scope.

**Related Features:**

- CCC.F04
- CCC.F16
- CCC.F19

**Related MITRE ATT&CK Values:**

- T1496
- T1499
- T1498

### CCC.TH13 - Resource Tags are Manipulated

Attackers may manipulate resource tags to alter organizational policies,
disrupt billing, or evade detection. This can result in mismanaged
resources, unauthorized access, or financial abuse.

**Related Features:**

- CCC.F20

**Related MITRE ATT&CK Values:**

- T1565

### CCC.TH14 - Older Resource Versions are Exploited

Attackers may exploit vulnerabilities in older versions of resources,
taking advantage of deprecated or insecure configurations. Without
proper version control and monitoring, outdated versions can be used
to bypass security measures.

**Related Features:**

- CCC.F18

**Related MITRE ATT&CK Values:**

- T1027
- T1485
- T1565
- T1489
- T1562.01
- T1027
- T1485
- T1565
- T1489

### CCC.TH15 - Automated Enumeration and Reconnaissance by Non-human Entities

Attackers may deploy automated processes or bots to perform reconnaissance
activities by enumerating resources such as APIs, file systems, or directories.
These activities can help attackers identify vulnerabilities, misconfigurations,
or unsecured resources, which can then be exploited for unauthorized access
or data theft.

**Related Features:**

- CCC.F14

**Related MITRE ATT&CK Values:**

- T1580

### CCC.ObjStor.TH01 - Data Exfiltration via Insecure Lifecycle Policies

Misconfigured lifecycle policies may unintentionally allow data to be
exfiltrated or destroyed prematurely, resulting in a loss of availability
and potential exposure of sensitive data.

**Related Features:**

- CCC.ObjStor.F08
- CCC.F11

**Related MITRE ATT&CK Values:**

- T1020
- T1537
- T1567
- T1048
- T1485

### CCC.ObjStor.TH02 - Improper Enforcement of Object Modification Locks

Attackers may exploit vulnerabilities in object modification locks to
delete or alter objects despite the lock being in place, leading to data
loss or tampering.

**Related Features:**

- CCC.ObjStor.F09

**Related MITRE ATT&CK Values:**

- T1027
- T1485
- T1490
- T1491
- T1565

## Controls

| Control ID      | Control Title                                                               |
| --------------- | --------------------------------------------------------------------------- |
| CCC.C01         | Prevent Unencrypted Requests                                                |
| CCC.C02         | Ensure Data Encryption at Rest for All Stored Data                          |
| CCC.C03         | Implement Multi-factor Authentication (MFA) for Access                      |
| CCC.C04         | Log All Access and Changes                                                  |
| CCC.C05         | Prevent Access from Untrusted Entities                                      |
| CCC.C06         | Prevent Deployment in Restricted Regions                                    |
| CCC.C07         | Alert on Unusual Enumeration Activity                                       |
| CCC.C08         | Enable Multi-zone or Multi-region Data Replication                          |
| CCC.C09         | Prevent Tampering, Deletion, or Unauthorized Access to Access Logs          |
| CCC.C10         | Prevent Data Replication to Destinations Outside of Defined Trust Perimeter |
| CCC.C11         | Enforce Key Management Policies                                             |
| CCC.ObjStor.C01 | Prevent Requests to Buckets or Objects with Untrusted KMS Keys              |
| CCC.ObjStor.C02 | Enforce Uniform Bucket-level Access to Prevent Inconsistent Permissions     |
| CCC.ObjStor.C03 | Prevent Bucket Deletion Through Irrevocable Bucket Retention Policy         |
| CCC.ObjStor.C04 | Objects have an Effective Retention Policy by Default                       |
| CCC.ObjStor.C05 | Versioning is Enabled for All Objects in the Bucket                         |
| CCC.ObjStor.C06 | Access Logs are Stored in a Separate Data Store                             |

---

### CCC.C01 - Prevent Unencrypted Requests

Ensure that all communications are encrypted in transit to protect data
integrity and confidentiality.

**Control Family:** Data

**NIST CSF:** PR.DS-02

**Mitigated Threats:**

- CCC.TH02

**Control Mappings:**

- CCM IVS-03
- CCM IVS-07
- ISO_27001 2013 A.13.1.1
- NIST_800_53 SC-8
- NIST_800_53 SC-13

### CCC.C02 - Ensure Data Encryption at Rest for All Stored Data

Ensure that all data stored is encrypted at rest to maintain
confidentiality and integrity.

**Control Family:** Encryption

**NIST CSF:** PR.DS-1

**Mitigated Threats:**

- CCC.TH01

**Control Mappings:**

### CCC.C03 - Implement Multi-factor Authentication (MFA) for Access

Ensure that all sensitive activities require two or more identity factors
during authentication to prevent unauthorized access. This may include
something you know, something you have, or something you are. In the
case of programattically accessible services, such as API endpoints, this
includes a combination of API keys or tokens and network restrictions.

**Control Family:** Identity and Access Management

**NIST CSF:** PR.AC-7

**Mitigated Threats:**

- CCC.TH01

**Control Mappings:**

- CCM IAM-03
- CCM IAM-08
- ISO_27001 2013 A.9.4.2
- NIST_800_53 IA-2

### CCC.C04 - Log All Access and Changes

Ensure that all access and changes are logged to maintain a
detailed audit trail for security and compliance purposes.

**Control Family:** Logging &amp; Monitoring

**NIST CSF:** DE.AE-3

**Mitigated Threats:**

- CCC.TH01

**Control Mappings:**

### CCC.C05 - Prevent Access from Untrusted Entities

Ensure that secure access controls prevent unauthorized access,
mitigate risks of data exfiltration, and block misuse of services
by adversaries. This includes restricting access based on trust
criteria such as IP allowlists, domain restrictions, and tenant
isolation.

**Control Family:** Identity and Access Management

**NIST CSF:** PR.AC-3

**Mitigated Threats:**

- CCC.TH01

**Control Mappings:**

- CCM DS-5
- ISO_27001 2013 A.13.1.3
- NIST_800_53 AC-3

### CCC.C06 - Prevent Deployment in Restricted Regions

Ensure that resources are not provisioned or deployed in
geographic regions or cloud availability zones that have been
designated as restricted or prohibited, to comply with
regulatory requirements and reduce exposure to geopolitical
risks.

**Control Family:** Data

**NIST CSF:** PR.DS-1

**Mitigated Threats:**

- CCC.TH03

**Control Mappings:**

- CCM DSI-06
- CCM DSI-08
- ISO_27001 2013 A.11.1.1
- NIST_800_53 AC-6

### CCC.C07 - Alert on Unusual Enumeration Activity

Ensure that logs and associated alerts are generated when
unusual enumeration activity is detected that may indicate
reconnaissance activities.

**Control Family:** Logging &amp; Monitoring

**NIST CSF:** DE.AE-1

**Mitigated Threats:**

- CCC.TH15

**Control Mappings:**

### CCC.C08 - Enable Multi-zone or Multi-region Data Replication

Ensure that data is replicated across multiple
zones or regions to protect against data loss due to hardware
failures, natural disasters, or other catastrophic events.

**Control Family:** Data

**NIST CSF:** PR.PT-5

**Mitigated Threats:**

- CCC.TH06

**Control Mappings:**

### CCC.C09 - Prevent Tampering, Deletion, or Unauthorized Access to Access Logs

Access logs should always be considered sensitive.
Ensure that access logs are protected against unauthorized
access, tampering, or deletion.

**Control Family:** Data

**NIST CSF:** PR.DS-6

**Mitigated Threats:**

- CCC.TH07
- CCC.TH09
- CCC.TH04

**Control Mappings:**

### CCC.C10 - Prevent Data Replication to Destinations Outside of Defined Trust Perimeter

Prevent replication of data to untrusted destinations outside
of defined trust perimeter. An untrusted destination is defined
as a resource that exists outside of a specified trusted
identity or network or data perimeter.

**Control Family:** Data

**NIST CSF:** PR.DS-5

**Mitigated Threats:**

- CCC.TH04

**Control Mappings:**

### CCC.C11 - Enforce Key Management Policies

Ensure that encryption keys are managed securely by enforcing
the use of approved algorithms, regular key rotation, and
customer-managed encryption keys (CMEKs).

**Control Family:** Encryption

**NIST CSF:** PR.DS-1

**Mitigated Threats:**

- CCC.TH16

**Control Mappings:**

- CCM EKM-02
- CCM EKM-03
- ISO_27001 2013 A.10.1.2
- NIST_800_53 SC-12
- NIST_800_53 SC-17

### CCC.ObjStor.C01 - Prevent Requests to Buckets or Objects with Untrusted KMS Keys

Prevent any requests to object storage buckets or objects using
untrusted KMS keys to protect against unauthorized data encryption
that can impact data availability and integrity.

**Control Family:** Data

**NIST CSF:** PR.DS-1

**Mitigated Threats:**

- CCC.TH01
- CCC.TH06

**Control Mappings:**

- CCM DCS-04
- CCM DCS-06
- ISO_27001 2013 A.10.1.1
- NIST_800_53 SC-28

### CCC.ObjStor.C02 - Enforce Uniform Bucket-level Access to Prevent Inconsistent Permissions

Ensure that uniform bucket-level access is enforced across all
object storage buckets. This prevents the use of ad-hoc or
inconsistent object-level permissions, ensuring centralized,
consistent, and secure access management in accordance with the
principle of least privilege.

**Control Family:** Identity and Access Management

**NIST CSF:** PR.AC-4

**Mitigated Threats:**

- CCC.TH01

**Control Mappings:**

- CCM DCS-09
- ISO_27001 2013 A.9.4.1
- NIST_800_53 AC-3
- NIST_800_53 AC-6

### CCC.ObjStor.C03 - Prevent Bucket Deletion Through Irrevocable Bucket Retention Policy

Ensure that object storage bucket is not deleted after creation,
and that the preventative measure cannot be unset.

**Control Family:** Data

**NIST CSF:** PR.DS-1

**Mitigated Threats:**

- CCC.TH06

**Control Mappings:**

### CCC.ObjStor.C04 - Objects have an Effective Retention Policy by Default

Ensure that all objects stored in the object storage system have a
retention policy applied by default, preventing premature deletion
or modification of objects and ensuring compliance with data retention
regulations.

**Control Family:** Data

**NIST CSF:** PR.DS-1

**Mitigated Threats:**

- CCC.TH06

**Control Mappings:**

### CCC.ObjStor.C05 - Versioning is Enabled for All Objects in the Bucket

Ensure that versioning is enabled for all objects stored in the object
storage bucket to enable recovery of previous versions of objects in
case of loss or corruption.

**Control Family:** Data

**NIST CSF:** PR.DS-1

**Mitigated Threats:**

- CCC.TH06

**Control Mappings:**

### CCC.ObjStor.C06 - Access Logs are Stored in a Separate Data Store

Ensure that access logs for object storage buckets are stored in a
separate data store to protect against unauthorized access, tampering,
or deletion of logs (Logbuckets are exempt from this requirement,
but must be tlp_red).

**Control Family:** Data

**NIST CSF:** PR.DS-6

**Mitigated Threats:**

- CCC.TH07
- CCC.TH09

**Control Mappings:**

## Contributing Organizations

We would like to acknowledge the following organizations for their valuable contributions to this project:

<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="500" zoomAndPan="magnify" viewBox="0 0 375 374.999991" height="500" preserveAspectRatio="xMidYMid meet" version="1.0"><defs><clipPath id="1d065bb98a"><path d="M 29.453125 175.449219 L 50 175.449219 L 50 212 L 29.453125 212 Z M 29.453125 175.449219 " clip-rule="nonzero"/></clipPath><clipPath id="4fc8771b80"><path d="M 42 189 L 71 189 L 71 216.699219 L 42 216.699219 Z M 42 189 " clip-rule="nonzero"/></clipPath><clipPath id="08d8f9b527"><path d="M 29.453125 175.449219 L 71 175.449219 L 71 216.699219 L 29.453125 216.699219 Z M 29.453125 175.449219 " clip-rule="nonzero"/></clipPath><clipPath id="2bcbcef9aa"><path d="M 202 189 L 216.199219 189 L 216.199219 205 L 202 205 Z M 202 189 " clip-rule="nonzero"/></clipPath><clipPath id="7588ae364b"><path d="M 46.160156 261.140625 L 325.910156 261.140625 L 325.910156 345.890625 L 46.160156 345.890625 Z M 46.160156 261.140625 " clip-rule="nonzero"/></clipPath><image x="0" y="0" width="566" xlink:href="data:image/png;base64,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" id="d7dfad9d25" height="171" preserveAspectRatio="xMidYMid meet"/><image x="0" y="0" width="500" xlink:href="data:image/png;base64,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" id="b5d9cb0eb9" height="500" preserveAspectRatio="xMidYMid meet"/></defs><rect x="-37.5" width="450" fill="#ffffff" y="-37.499999" height="449.999989" fill-opacity="1"/><rect x="-37.5" width="450" fill="#ffffff" y="-37.499999" height="449.999989" fill-opacity="1"/><g clip-path="url(#1d065bb98a)"><path fill="#ef7d3a" d="M 38.871094 176.519531 L 29.453125 175.492188 L 30.589844 185.78125 L 29.453125 210.789062 L 29.453125 211.304688 L 40.734375 187.121094 L 49.328125 175.492188 Z M 38.871094 176.519531 " fill-opacity="1" fill-rule="nonzero"/></g><g clip-path="url(#4fc8771b80)"><path fill="#00aeb9" d="M 70.960938 189.796875 L 58.332031 207.804688 L 42.496094 216.65625 L 60.609375 215.628906 L 70.960938 216.65625 L 69.824219 206.46875 Z M 70.960938 189.796875 " fill-opacity="1" fill-rule="nonzero"/></g><g clip-path="url(#08d8f9b527)"><path fill="#d4006a" d="M 70.960938 175.492188 L 54.710938 175.492188 L 42.496094 205.542969 L 29.554688 216.554688 L 37.007812 216.554688 L 58.4375 193.914062 L 70.960938 184.445312 Z M 70.960938 175.492188 " fill-opacity="1" fill-rule="nonzero"/></g><path fill="#242424" d="M 81.210938 197.925781 L 84.316406 197.925781 C 84.421875 200.601562 85.972656 201.941406 89.390625 201.941406 C 92.183594 201.941406 93.632812 201.117188 93.632812 199.367188 C 93.632812 197.515625 91.976562 197.207031 88.769531 196.484375 C 84.007812 195.351562 81.730469 194.425781 81.730469 191.238281 C 81.730469 187.839844 84.316406 186.195312 88.871094 186.195312 C 93.839844 186.195312 96.429688 188.355469 96.429688 192.574219 L 93.324219 192.574219 C 93.117188 189.898438 91.875 188.871094 88.664062 188.871094 C 85.972656 188.871094 84.730469 189.589844 84.730469 191.238281 C 84.730469 192.988281 86.285156 193.296875 89.804688 194.117188 C 94.359375 195.25 96.636719 196.074219 96.636719 199.265625 C 96.636719 202.660156 94.046875 204.71875 89.078125 204.71875 C 84.007812 204.617188 81.210938 202.453125 81.210938 197.925781 Z M 81.210938 197.925781 " fill-opacity="1" fill-rule="nonzero"/><path fill="#242424" d="M 98.5 197.207031 C 98.5 193.398438 100.050781 189.796875 105.640625 189.796875 C 110.09375 189.796875 112.164062 192.164062 112.164062 195.765625 L 109.058594 195.765625 C 108.851562 193.5 107.917969 192.265625 105.539062 192.265625 C 102.433594 192.265625 101.5 194.425781 101.5 197.207031 C 101.5 199.984375 102.328125 202.042969 105.539062 202.042969 C 107.917969 202.042969 108.746094 200.910156 108.953125 198.75 L 112.058594 198.75 C 112.058594 202.25 110.09375 204.617188 105.640625 204.617188 C 99.949219 204.617188 98.5 201.011719 98.5 197.207031 Z M 98.5 197.207031 " fill-opacity="1" fill-rule="nonzero"/><path fill="#242424" d="M 113.507812 197.207031 C 113.507812 193.398438 114.957031 189.796875 120.652344 189.796875 C 126.242188 189.796875 127.796875 193.398438 127.796875 197.207031 C 127.796875 201.011719 126.242188 204.617188 120.546875 204.617188 C 114.957031 204.617188 113.507812 201.011719 113.507812 197.207031 Z M 120.652344 202.144531 C 124.070312 202.144531 124.792969 199.984375 124.792969 197.207031 C 124.792969 194.53125 124.070312 192.265625 120.652344 192.265625 C 117.234375 192.265625 116.511719 194.53125 116.511719 197.207031 C 116.613281 199.882812 117.339844 202.144531 120.652344 202.144531 Z M 120.652344 202.144531 " fill-opacity="1" fill-rule="nonzero"/><path fill="#242424" d="M 130.488281 200.292969 L 130.488281 192.472656 L 128.417969 192.472656 L 128.417969 190.621094 L 130.488281 190.003906 L 130.488281 186.398438 L 133.386719 186.398438 L 133.386719 190.003906 L 137.214844 190.003906 L 137.214844 192.472656 L 133.488281 192.472656 L 133.488281 200.292969 C 133.488281 201.632812 134.109375 202.25 137.214844 202.144531 L 137.214844 204.617188 C 132.558594 204.820312 130.488281 203.6875 130.488281 200.292969 Z M 130.488281 200.292969 " fill-opacity="1" fill-rule="nonzero"/><path fill="#242424" d="M 140.21875 200.292969 L 140.21875 192.472656 L 138.148438 192.472656 L 138.148438 190.105469 L 140.21875 190.105469 L 140.21875 186.503906 L 143.117188 186.503906 L 143.117188 190.105469 L 146.945312 190.105469 L 146.945312 192.574219 L 143.324219 192.574219 L 143.324219 200.394531 C 143.324219 201.734375 143.945312 202.351562 147.050781 202.25 L 147.050781 204.71875 C 142.289062 204.820312 140.21875 203.6875 140.21875 200.292969 Z M 140.21875 200.292969 " fill-opacity="1" fill-rule="nonzero"/><path fill="#242424" d="M 155.847656 186.398438 L 158.953125 186.398438 L 158.953125 201.835938 L 165.785156 201.835938 L 165.785156 204.410156 L 155.746094 204.410156 Z M 155.847656 186.398438 " fill-opacity="1" fill-rule="nonzero"/><path fill="#242424" d="M 166.71875 197.207031 C 166.71875 193.398438 168.167969 189.796875 173.863281 189.796875 C 179.453125 189.796875 181.003906 193.398438 181.003906 197.207031 C 181.003906 201.011719 179.453125 204.617188 173.757812 204.617188 C 168.167969 204.617188 166.71875 201.011719 166.71875 197.207031 Z M 173.863281 202.144531 C 177.277344 202.144531 178.003906 199.984375 178.003906 197.207031 C 178.003906 194.53125 177.277344 192.265625 173.863281 192.265625 C 170.445312 192.265625 169.722656 194.53125 169.722656 197.207031 C 169.824219 199.882812 170.550781 202.144531 173.863281 202.144531 Z M 173.863281 202.144531 " fill-opacity="1" fill-rule="nonzero"/><path fill="#242424" d="M 189.699219 202.96875 C 186.699219 202.558594 185.351562 202.351562 185.351562 201.632812 C 185.351562 200.910156 186.285156 200.910156 189.285156 200.808594 C 194.460938 200.703125 195.601562 198.542969 195.601562 195.765625 C 195.601562 193.605469 194.875 192.574219 193.945312 192.164062 L 196.015625 190.003906 L 189.597656 190.003906 C 187.734375 190.003906 182.453125 190.003906 182.453125 195.351562 C 182.453125 197.101562 182.972656 198.542969 184.628906 199.46875 C 182.972656 199.882812 182.144531 200.5 182.144531 201.941406 C 182.144531 204.410156 184.214844 204.71875 189.390625 205.4375 C 192.082031 205.746094 193.21875 206.054688 193.21875 207.394531 C 193.21875 208.21875 192.597656 209.246094 189.183594 209.246094 C 187.007812 209.246094 185.972656 208.835938 185.558594 208.011719 L 182.144531 208.011719 C 182.660156 210.378906 184.523438 211.714844 188.976562 211.714844 C 194.980469 211.714844 196.429688 209.246094 196.429688 207.085938 C 196.53125 203.792969 192.804688 203.378906 189.699219 202.96875 Z M 189.078125 192.574219 C 191.875 192.574219 192.496094 193.808594 192.496094 195.457031 C 192.496094 197.308594 191.875 198.542969 189.078125 198.542969 C 186.285156 198.542969 185.664062 197.207031 185.664062 195.558594 C 185.664062 193.808594 186.285156 192.574219 189.078125 192.574219 Z M 189.078125 192.574219 " fill-opacity="1" fill-rule="nonzero"/><path fill="#242424" d="M 199.222656 184.136719 C 200.570312 184.136719 201.398438 184.546875 201.398438 185.988281 C 201.398438 187.429688 200.570312 187.839844 199.222656 187.839844 C 197.878906 187.839844 196.945312 187.429688 196.945312 185.988281 C 196.945312 184.445312 197.878906 184.136719 199.222656 184.136719 Z M 197.671875 190.003906 L 200.671875 190.003906 L 200.671875 204.410156 L 197.671875 204.410156 Z M 197.671875 190.003906 " fill-opacity="1" fill-rule="nonzero"/><g clip-path="url(#2bcbcef9aa)"><path fill="#242424" d="M 202.535156 197.207031 C 202.535156 193.398438 204.089844 189.796875 209.679688 189.796875 C 214.128906 189.796875 216.199219 192.164062 216.199219 195.765625 L 213.09375 195.765625 C 212.886719 193.5 211.957031 192.265625 209.574219 192.265625 C 206.46875 192.265625 205.539062 194.425781 205.539062 197.207031 C 205.539062 199.984375 206.367188 202.042969 209.574219 202.042969 C 211.957031 202.042969 212.785156 200.910156 212.992188 198.75 L 216.097656 198.75 C 216.097656 202.25 214.128906 204.617188 209.679688 204.617188 C 204.089844 204.617188 202.535156 201.011719 202.535156 197.207031 Z M 202.535156 197.207031 " fill-opacity="1" fill-rule="nonzero"/></g><path fill="#ea4335" d="M 266.867188 95.394531 C 266.867188 102.445312 261.324219 107.640625 254.519531 107.640625 C 247.714844 107.640625 242.171875 102.445312 242.171875 95.394531 C 242.171875 88.296875 247.714844 83.152344 254.519531 83.152344 C 261.324219 83.152344 266.867188 88.296875 266.867188 95.394531 Z M 261.464844 95.394531 C 261.464844 90.992188 258.25 87.976562 254.519531 87.976562 C 250.792969 87.976562 247.578125 90.992188 247.578125 95.394531 C 247.578125 99.757812 250.792969 102.816406 254.519531 102.816406 C 258.25 102.816406 261.464844 99.75 261.464844 95.394531 Z M 261.464844 95.394531 " fill-opacity="1" fill-rule="nonzero"/><path fill="#fbbc05" d="M 293.507812 95.394531 C 293.507812 102.445312 287.964844 107.640625 281.160156 107.640625 C 274.355469 107.640625 268.8125 102.445312 268.8125 95.394531 C 268.8125 88.300781 274.355469 83.152344 281.160156 83.152344 C 287.964844 83.152344 293.507812 88.296875 293.507812 95.394531 Z M 288.101562 95.394531 C 288.101562 90.992188 284.890625 87.976562 281.160156 87.976562 C 277.429688 87.976562 274.21875 90.992188 274.21875 95.394531 C 274.21875 99.757812 277.429688 102.816406 281.160156 102.816406 C 284.890625 102.816406 288.101562 99.75 288.101562 95.394531 Z M 288.101562 95.394531 " fill-opacity="1" fill-rule="nonzero"/><path fill="#4285f4" d="M 319.039062 83.890625 L 319.039062 105.875 C 319.039062 114.917969 313.675781 118.609375 307.339844 118.609375 C 301.371094 118.609375 297.78125 114.640625 296.425781 111.394531 L 301.132812 109.445312 C 301.972656 111.4375 304.023438 113.789062 307.332031 113.789062 C 311.390625 113.789062 313.902344 111.300781 313.902344 106.613281 L 313.902344 104.851562 L 313.714844 104.851562 C 312.503906 106.335938 310.175781 107.632812 307.234375 107.632812 C 301.078125 107.632812 295.441406 102.300781 295.441406 95.441406 C 295.441406 88.527344 301.078125 83.152344 307.234375 83.152344 C 310.167969 83.152344 312.5 84.449219 313.714844 85.890625 L 313.902344 85.890625 L 313.902344 83.898438 L 319.039062 83.898438 Z M 314.285156 95.441406 C 314.285156 91.128906 311.394531 87.976562 307.714844 87.976562 C 303.984375 87.976562 300.863281 91.128906 300.863281 95.441406 C 300.863281 99.707031 303.984375 102.816406 307.714844 102.816406 C 311.394531 102.816406 314.285156 99.707031 314.285156 95.441406 Z M 314.285156 95.441406 " fill-opacity="1" fill-rule="nonzero"/><path fill="#34a853" d="M 327.5 71.007812 L 327.5 106.890625 L 322.230469 106.890625 L 322.230469 71.007812 Z M 327.5 71.007812 " fill-opacity="1" fill-rule="nonzero"/><path fill="#ea4335" d="M 348.046875 99.425781 L 352.242188 102.207031 C 350.886719 104.199219 347.625 107.632812 341.984375 107.632812 C 334.992188 107.632812 329.769531 102.257812 329.769531 95.390625 C 329.769531 88.109375 335.039062 83.144531 341.382812 83.144531 C 347.769531 83.144531 350.894531 88.203125 351.914062 90.933594 L 352.476562 92.328125 L 336.019531 99.105469 C 337.28125 101.5625 339.238281 102.816406 341.984375 102.816406 C 344.738281 102.816406 346.648438 101.46875 348.046875 99.425781 Z M 335.132812 95.019531 L 346.132812 90.476562 C 345.527344 88.949219 343.707031 87.882812 341.5625 87.882812 C 338.816406 87.882812 334.992188 90.292969 335.132812 95.019531 Z M 335.132812 95.019531 " fill-opacity="1" fill-rule="nonzero"/><path fill="#4285f4" d="M 222.214844 92.210938 L 222.214844 87.015625 L 239.8125 87.015625 C 239.984375 87.921875 240.074219 88.992188 240.074219 90.152344 C 240.074219 94.046875 239.003906 98.867188 235.550781 102.300781 C 232.195312 105.78125 227.902344 107.632812 222.222656 107.632812 C 211.6875 107.632812 202.828125 99.101562 202.828125 88.621094 C 202.828125 78.144531 211.6875 69.609375 222.222656 69.609375 C 228.046875 69.609375 232.199219 71.882812 235.316406 74.847656 L 231.632812 78.515625 C 229.398438 76.425781 226.367188 74.804688 222.214844 74.804688 C 214.523438 74.804688 208.507812 80.96875 208.507812 88.621094 C 208.507812 96.273438 214.523438 102.441406 222.214844 102.441406 C 227.203125 102.441406 230.046875 100.445312 231.867188 98.636719 C 233.34375 97.167969 234.3125 95.070312 234.695312 92.203125 Z M 222.214844 92.210938 " fill-opacity="1" fill-rule="nonzero"/><path fill="#255be3" d="M 30.597656 94.566406 C 30.597656 82.289062 40.640625 72.730469 53.730469 72.730469 C 61.308594 72.730469 68.222656 76.109375 72.175781 81.21875 L 66.492188 86.902344 C 65.742188 85.9375 64.890625 85.070312 63.941406 84.296875 C 62.992188 83.523438 61.964844 82.863281 60.867188 82.320312 C 59.769531 81.78125 58.628906 81.367188 57.4375 81.082031 C 56.246094 80.800781 55.039062 80.652344 53.816406 80.640625 C 45.992188 80.640625 39.734375 86.492188 39.734375 94.566406 C 39.734375 102.726562 45.992188 108.574219 53.816406 108.574219 C 55.082031 108.574219 56.332031 108.425781 57.566406 108.136719 C 58.800781 107.847656 59.984375 107.417969 61.121094 106.855469 C 62.257812 106.289062 63.3125 105.601562 64.289062 104.792969 C 65.265625 103.984375 66.136719 103.074219 66.90625 102.066406 L 72.503906 107.585938 C 68.71875 112.941406 61.472656 116.484375 53.730469 116.484375 C 40.640625 116.484375 30.597656 106.925781 30.597656 94.566406 Z M 30.597656 94.566406 " fill-opacity="1" fill-rule="nonzero"/><path fill="#255be3" d="M 79.914062 74.214844 L 88.886719 74.214844 L 88.886719 115.003906 L 79.914062 115.003906 Z M 79.914062 74.214844 " fill-opacity="1" fill-rule="nonzero"/><path fill="#255be3" d="M 105.601562 104.042969 L 105.601562 81.792969 L 95.804688 81.792969 L 95.804688 74.214844 L 106.015625 74.214844 L 106.015625 65.476562 L 114.410156 61.359375 L 114.410156 74.214844 L 127.75 74.214844 L 127.75 81.792969 L 114.410156 81.792969 L 114.410156 102.558594 C 114.410156 106.679688 116.71875 108.492188 121.082031 108.492188 C 123.378906 108.503906 125.574219 108.039062 127.667969 107.09375 L 127.667969 114.835938 C 125.042969 115.988281 122.300781 116.539062 119.433594 116.484375 C 111.449219 116.484375 105.601562 112.117188 105.601562 104.042969 Z M 105.601562 104.042969 " fill-opacity="1" fill-rule="nonzero"/><path fill="#255be3" d="M 134.832031 74.214844 L 143.804688 74.214844 L 143.804688 115.003906 L 134.832031 115.003906 Z M 134.832031 74.214844 " fill-opacity="1" fill-rule="nonzero"/><path fill="#ff3c28" d="M 111.777344 48.257812 C 113.613281 48.25 115.441406 48.355469 117.265625 48.574219 C 119.089844 48.789062 120.894531 49.109375 122.679688 49.542969 C 124.460938 49.972656 126.214844 50.511719 127.9375 51.152344 C 129.65625 51.796875 131.332031 52.539062 132.964844 53.382812 C 134.59375 54.222656 136.167969 55.160156 137.6875 56.195312 C 139.207031 57.226562 140.660156 58.347656 142.042969 59.550781 C 143.429688 60.757812 144.738281 62.042969 145.96875 63.40625 C 147.199219 64.769531 148.34375 66.203125 149.402344 67.703125 L 138.945312 67.703125 C 138.09375 66.753906 137.191406 65.847656 136.242188 64.992188 C 135.292969 64.136719 134.300781 63.332031 133.269531 62.582031 C 132.234375 61.832031 131.164062 61.132812 130.058594 60.496094 C 128.953125 59.855469 127.816406 59.277344 126.648438 58.753906 C 125.480469 58.234375 124.292969 57.777344 123.078125 57.382812 C 121.859375 56.988281 120.628906 56.65625 119.378906 56.390625 C 118.128906 56.125 116.871094 55.925781 115.597656 55.789062 C 114.328125 55.65625 113.054688 55.589844 111.777344 55.589844 C 110.5 55.589844 109.226562 55.65625 107.957031 55.789062 C 106.683594 55.925781 105.425781 56.125 104.175781 56.390625 C 102.925781 56.65625 101.691406 56.988281 100.476562 57.382812 C 99.261719 57.777344 98.070312 58.234375 96.90625 58.753906 C 95.738281 59.277344 94.601562 59.855469 93.496094 60.496094 C 92.390625 61.132812 91.320312 61.832031 90.285156 62.582031 C 89.253906 63.332031 88.261719 64.136719 87.3125 64.992188 C 86.363281 65.847656 85.460938 66.753906 84.605469 67.703125 L 74.152344 67.703125 C 75.210938 66.203125 76.355469 64.769531 77.585938 63.40625 C 78.816406 62.042969 80.125 60.757812 81.511719 59.550781 C 82.894531 58.347656 84.347656 57.226562 85.867188 56.195312 C 87.386719 55.160156 88.960938 54.222656 90.589844 53.382812 C 92.222656 52.539062 93.898438 51.796875 95.617188 51.152344 C 97.339844 50.511719 99.089844 49.972656 100.875 49.542969 C 102.660156 49.109375 104.464844 48.789062 106.289062 48.574219 C 108.113281 48.355469 109.941406 48.25 111.777344 48.257812 Z M 111.777344 48.257812 " fill-opacity="1" fill-rule="nonzero"/><g clip-path="url(#7588ae364b)"><g transform="matrix(0.494258, 0, 0, 0.495614, 46.159338, 261.140169)"><image x="0" y="0" width="566" xlink:href="data:image/png;base64,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" height="171" preserveAspectRatio="xMidYMid meet"/></g></g><g transform="matrix(0.273, 0, 0, 0.273, 215.900263, 127.736696)"><image x="0" y="0" width="500" xlink:href="data:image/png;base64,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" height="500" preserveAspectRatio="xMidYMid meet"/></g></svg>
