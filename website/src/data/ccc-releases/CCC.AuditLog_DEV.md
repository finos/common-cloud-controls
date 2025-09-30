
<style>
body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    margin: 0.2in;
    font-size: 11pt;
    line-height: 1.5;
    color: #333333;
}
h1, h2, h3, h4{
    color: #1A5276;
    margin-top: 0.5in;
    margin-bottom: 0.2in;
    font-weight: bold;
}
h1 { font-size: 22t; }
h2 { font-size: 18pt; }
h3 { font-size: 16pt; }
h4 { font-size: 14pt; }
p { 
	font-size: 11pt;
	margin-bottom: 0.15in;
}
img {
	max-height: 100px
}

code, pre {
    background-color: #f8f8f8;
    padding: 0.2in;
    border: 1px solid #dddddd;
    border-radius: 4px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 10pt;
    overflow-x: auto;
}
blockquote {
    margin: 0.5in 0;
    padding: 0.3in;
    border-left: 5px solid #cccccc;
    font-style: italic;
}
table {
	width: 100%;
	border-collapse: collapse;
	border-style: hidden;
}
th, td {
	border: 1px solid #ddd;
	padding: 8px;
}
.flex-container {
    display: flex;
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
}
.flex-item-left {
    flex: 1;
    padding-right: 10px;
}
.flex-item-right {
    flex: 1;
    padding-left: 10px;
}
@page {
    margin: 0.2in;
}
</style>



<img width="50%" src="https://raw.githubusercontent.com/finos/branding/882d52260eb9b85a4097db38b09a52ea9bb68734/project-logos/active-project-logos/Common%20Cloud%20Controls%20Logo/Horizontal/2023_FinosCCC_Horizontal_BLK.svg" alt="CCC Logo"/>

# CCC.AuditLog vDEV (Audit Logging)

Provides the ability to transmit system events, application activities,
and/or user interactions to a logging service.


<div style="page-break-after: always;"></div>

## Release Details

> This is a development build without formal release details.
>
> _- Development Build,  ([](https://github.com/))_

### Contributors to this Release

| Name | Company | GitHub ID |
| ---- | ------- | ------ |
| Development Team |  | [](https://github.com/) |

<div style="page-break-after: always;"></div>

## Capabilities

The following capabilities are required to be present on a resource for it to be considered a Audit Logging service. Threats outlined later in this catalog are assesssed based on the presence of these capabilities.

- **CCC.AuditLog.F01: Default Retention Period**
  
  Cloud providers support a default minimum retention of audit log data.

- **CCC.AuditLog.F02: Export**
  
  Support for manual &#34;one off&#34; exporting or downloading of raw log events.

- **CCC.AuditLog.F03: Sink**
  
  Ability to continually stream audit log data to a hosted storage bucket or data lake solution.

- **CCC.AuditLog.F04: Event Types**
  
  Audit events are generated with different data types to provide specific fields for the system which generated the event, such as Management Event, Data Event and Policy Event.

- **CCC.AuditLog.F05: Time Search**
  
  Ability to search for audit events across a specific time range.

- **CCC.AuditLog.F06: Filtering**
  
  Ability to filter audit events based on specific attribute.

- **CCC.AuditLog.F07: Immutable Log Entries**
  
  Audit Log events are immutable and cannot be altered or deleted once generated.

- **CCC.AuditLog.F08: External Sink**
  
  Audit log events can be configured to be sent to a external SIEM or data analysis provider outside of the cloud platform.

- **CCC.Core.F01: Encryption in Transit Enabled by Default**
  
  The service automatically encrypts all data using industry-standard cryptographic protocols prior to transmission via a network interface.

- **CCC.Core.F02: Encryption at Rest Enabled by Default**
  
  The service automatically encrypts all data using industry-standard cryptographic protocols prior to being written to a storage medium.

- **CCC.Core.F03: Access Log Publication**
  
  The service automatically publishes structured, verbose records of activities performed within the scope of the service by external actors.

- **CCC.Core.F06: Access Control**
  
  The service automatically enforces user configurations to restrict or allow access to a specific component or a child resource based on factors such as user identities, roles, groups, or attributes.

- **CCC.Core.F07: Event Publication**
  
  The service automatically publishes a structured state-change record upon creation, deletion, or modification of data, configuration, components, or child resources.

- **CCC.Core.F08: Data Replication**
  
  The service automatically will or can be configured to replicate data across multiple deployments simultaneously with parity.

- **CCC.Core.F09: Metrics Publication**
  
  The service automatically publishes structured, numeric, time-series data points related to the performance, availability, and health of the service or its child resources.

- **CCC.Core.F10: Log Publication**
  
  The service automatically publishes structured, verbose records of activities, operations, or events that occur within the service.

- **CCC.Core.F14: API Access**
  
  The service exposes a port enabling external actors to interact programmatically with the service and its resources using HTTP protocol methods such as GET, POST, PUT, and DELETE.

- **CCC.Core.F17: Alerting**
  
  The service may be configured to emit a notification based on a user-defined condition related to the data published by a child or networked resource.

- **CCC.Core.F21: Resource Replication**
  
  The service may be configured to replicate child resources across multiple deployments.


<div style="page-break-after: always;"></div>

## Threats

The following threats have been identified based upon Audit Logging service capabilities. Controls outlined later in this catalog are designed to mitigate these threats. If you are aware of threats to Audit Logging services that are not captured here, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the identified threats, which is then followed by an elucidation of each threat and relevant mappings.

|Threat ID|Threat Title|
|----|----|
|CCC.AUDITLOG.TH01|Insufficient Audit Logs|
|CCC.AUDITLOG.TH02|Log Ingestion Latency|
|CCC.AUDITLOG.TH03|Sensitive Data Logged|
|CCC.AUDITLOG.TH04|Insufficient encoding of audit logs|
|CCC.AUDITLOG.TH05|Logging Evasion via violating size constraints|
|CCC.Core.TH01|Access Control is Misconfigured|
|CCC.Core.TH04|Data is Replicated to Untrusted or External Locations|
|CCC.Core.TH06|Data is Lost or Corrupted|
|CCC.Core.TH07|Logs are Tampered With or Deleted|
|CCC.Core.TH09|Runtime Logs are Read by Unauthorized Entities|
|CCC.Core.TH16|Publications are Disabled|

---

### CCC.AUDITLOG.TH01

**Insufficient Audit Logs**

**Description:** If security critical audit events are not logged then it increases the difficulty to detect threats
and perform post incident analysis.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F03</li>
  <li>CCC.Core.F10</li>
  </ul>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Relevant External Item</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>A09:2021</td>
          <td>OWASPTOP10</td>
        </tr>
        <tr>
          <td>CWE-778</td>
          <td>CWE</td>
        </tr>
        <tr>
          <td>CWE-223</td>
          <td>CWE</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.AUDITLOG.TH02

**Log Ingestion Latency**

**Description:** Large spikes or sustained delays in log ingestion may degrade the timeliness
and completeness of security telemetry.
This can increase the time required to detect and investigate threats,
potentially impacting incident response effectiveness.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F03</li>
  <li>CCC.Core.F10</li>
  </ul>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Relevant External Item</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>TA0005</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>A09:2021</td>
          <td>OWASPTOP10</td>
        </tr>
        <tr>
          <td>CWE-778</td>
          <td>CWE</td>
        </tr>
        <tr>
          <td>CWE-223</td>
          <td>CWE</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.AUDITLOG.TH03

**Sensitive Data Logged**

**Description:** Sensitive information such as  passwords, environment variables,
or personally identifiable information (PII)
may be included in audit logs due to a number of reasons such as;
end user human error, developers not sanitizing fields or
maliciously by a threat actor attempting to exfil data.
This can lead to unauthorized disclosure if logs are accessed by
unintended parties or forwarded to external systems.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.AuditLog.F03</li>
  <li>CCC.AuditLog.F08</li>
  <li>CCC.Core.F03</li>
  <li>CCC.Core.F10</li>
  </ul>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Relevant External Item</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>TA0006</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>A09:2021</td>
          <td>OWASPTOP10</td>
        </tr>
        <tr>
          <td>A02:2021</td>
          <td>OWASPTOP10</td>
        </tr>
        <tr>
          <td>CWE-532</td>
          <td>CWE</td>
        </tr>
        <tr>
          <td>CWE-200</td>
          <td>CWE</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.AUDITLOG.TH04

**Insufficient encoding of audit logs**

**Description:** User-supplied data such as scripts, control characters, escape sequences, or code fragments
may be written to audit logs without proper encoding or sanitization. This can result in malformed
or unexpected log entries that could disrupt or compromise systems that process or display these logs,
including log viewers or downstream services.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.AuditLog.F03</li>
  <li>CCC.AuditLog.F08</li>
  <li>CCC.Core.F03</li>
  <li>CCC.Core.F10</li>
  </ul>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Relevant External Item</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>A03:2021</td>
          <td>OWASPTOP10</td>
        </tr>
        <tr>
          <td>A09:2021</td>
          <td>OWASPTOP10</td>
        </tr>
        <tr>
          <td>CWE-79</td>
          <td>CWE</td>
        </tr>
        <tr>
          <td>CWE-117</td>
          <td>CWE</td>
        </tr>
        <tr>
          <td>CWE-116</td>
          <td>CWE</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.AUDITLOG.TH05

**Logging Evasion via violating size constraints**

**Description:** An attacker can evade detection by intentionally crafting input that violates
the size constraints of a clouds audit logging mechanism.
Many systems impose a maximum size limit on individual log entries.
By performing an action with oversized data such as whitespace or Unicode injection,
the resulting log event, which often includes the offending data,
exceeds this limit, which often is redacted in the audit logs.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F03</li>
  <li>CCC.Core.F10</li>
  </ul>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Relevant External Item</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>A09:2021</td>
          <td>OWASPTOP10</td>
        </tr>
        <tr>
          <td>CWE-778</td>
          <td>CWE</td>
        </tr>
        <tr>
          <td>CWE-223</td>
          <td>CWE</td>
        </tr>
        <tr>
          <td>CWE-20</td>
          <td>CWE</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.TH01

**Access Control is Misconfigured**

**Description:** Misconfigured access controls may grant excessive privileges or fail to
restrict unauthorized access to the service and its child resources.
This could result in a loss of data confidentiality or tolerance of
unauthorized actions which impact the integrity and availability of
resources and data.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F06</li>
  </ul>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Relevant External Item</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>T1078</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1548</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1203</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1098</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1484</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1546</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1537</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1567</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1048</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1485</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1565</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1027</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.TH04

**Data is Replicated to Untrusted or External Locations**

**Description:** Systems are susceptible to unauthorized access or interception by actors
with political or physical control over the network in which they are
deployed. Confidentiality may be impacted if the data is replicated to a
network where the geopolitical status is untrusted, unstable, or insecure.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F21</li>
  </ul>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Relevant External Item</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>T1565</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.TH06

**Data is Lost or Corrupted**

**Description:** Services that rely on accurate data are susceptible to disruption in the
event of data loss or corruption. Any actions that lead to the unintended
deletion, alteration, or limited access to data can impact the
availability of the service and the system it is part of.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F11</li>
  <li>CCC.Core.F18</li>
  </ul>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Relevant External Item</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>T1485</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1565</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1491</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1490</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.TH07

**Logs are Tampered With or Deleted**

**Description:** Tampering or deletion of service logs will reduce the system&#39;s ability to
maintain an accurate record of events. Any actions that compromise the
integrity of logs could disrupt system availability by disrupting
monitoring, hindering forensic investigations, and reducing the accuracy
of audit trails.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F03</li>
  <li>CCC.Core.F10</li>
  </ul>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Relevant External Item</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>T1070</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1565</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1027</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.TH09

**Runtime Logs are Read by Unauthorized Entities**

**Description:** Unauthorized access to logs may expose valuable information about the
system&#39;s configuration, operations, and security mechanisms. This could
jeopardize system availability through the exposure of vulnerabilities
and support the planning of attacks on the service, system, or network.
If logs are not adequately sanitized, this may also directly impact the
confidentiality of sensitive data.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F03</li>
  <li>CCC.Core.F09</li>
  </ul>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Relevant External Item</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>T1003</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1007</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1018</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1033</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1046</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1057</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1069</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1070</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1082</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1120</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1124</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1497</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1518</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.TH16

**Publications are Disabled**

**Description:** Publication of events, metrics, and runtime logs may be disabled, leading
to a lack of expected security and operational information being shared.
This can impact system availability by delaying the detection of
incidents while also impacting system design decisions and enforcement of
operational thresholds, such as autoscaling or cost management.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F10</li>
  <li>CCC.Core.F09</li>
  </ul>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Relevant External Item</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>T1562</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>


<div style="page-break-after: always;"></div>

## Controls

The following controls have been designed to mitigate the aforementioned threats that have been identified for CCC.AuditLog. Each control includes one or more Assessment Requirements that should always pass for a service to be considered compliant with this control catalog. If your experience can help improve these controls, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the controls, which is then followed by an elucidation of each control and relevant mappings.

|Control ID|Control Title|
|----|----|
|CCC.AuditLog.C01|Implement Digital Signatures With Hash Chaining|
|CCC.AuditLog.C02|Enable And Validate All Audit Log Types|
|CCC.AuditLog.C03|Alert On Audit Log Changes And Access|
|CCC.AuditLog.C04|Ensure Access Logging Is Enabled on the Audit Log Bucket|
|CCC.AuditLog.C05|Export Audit Logs To Bucket|
|CCC.AuditLog.C06|Enforce Retention Policy on Audit Log Bucket|
|CCC.AuditLog.C07|Enforce MFA Delete on Audit Log Bucket|
|CCC.AuditLog.C08|Enable Object Lock On Audit Log Bucket|
|CCC.AuditLog.C09|Restrict Field And Log Type Access|
|CCC.AuditLog.C10|Ensure Audit Bucket is Not Publicly Accessible|
|CCC.Core.C01|Encrypt Data for Transmission|
|CCC.Core.C02|Encrypt Data for Storage|
|CCC.Core.C06|Restrict Deployments to Trust Perimeter|
|CCC.Core.C08|Replicate Data to Multiple Locations|
|CCC.Core.C09|Ensure Integrity of Access Logs|
|CCC.Core.C10|Restrict Data Replication to Trust Perimeter|
|CCC.Core.C11|Protect Encryption Keys|
|CCC.Core.C03|Implement Multi-factor Authentication (MFA) for Access|
|CCC.Core.C05|Prevent Access from Untrusted Entities|
|CCC.Core.C04|Log All Access and Changes|
|CCC.Core.C07|Alert on Unusual Enumeration Activity|

### CCC.AuditLog.C01

**Implement Digital Signatures With Hash Chaining**

**Objective:** Digital signatures allows for external verification of log data tampering and
hash chaining allows for deleted log files to be detected.


| Assessment Requirement | Applicability |
| --- | --- |
| When the signature validation process is performed, then it MUST detect any modification of data. |tlp-red<br /> |
| When the signature validation process is performed, then it MUST detect any missing (deleted) log file. |tlp-red<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH06</td>
        </tr>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH07</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>PR.DS-01</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-9</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.AuditLog.C02

**Enable And Validate All Audit Log Types**

**Objective:** Review audit log configuration and ensure that all audit log types
are being generated and replicated to configured sinks


| Assessment Requirement | Applicability |
| --- | --- |
| When a manual action is performed to generate each audit log type, then the corresponding audit log type MUST be generated and recorded. |tlp-red<br />tlp-amber<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH06</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>PR.PS-04</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-2</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-3</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-12</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.AuditLog.C03

**Alert On Audit Log Changes And Access**

**Objective:** Ensure that specific alerts have been configured to detect changes in
audit log configuration such as disabling exporting of logs.
Alerts MUST also be created to detect changes in retention/object lock policies
for exported data log sources/buckets.


| Assessment Requirement | Applicability |
| --- | --- |
| When an attempt is made to disable a log source, then an alert MUST be generated. |tlp-red<br />tlp-amber<br /> |
| When an attempt is made to alter the retention or object lock status of an external data log source or bucket, then an alert MUST be generated. |tlp-red<br />tlp-amber<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH07</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>DE.CM-1</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-5</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-6</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.AuditLog.C04

**Ensure Access Logging Is Enabled on the Audit Log Bucket**

**Objective:** Ensure that access logging is enabled for the audit log storage bucket to
capture all requests made to the bucket, providing an audit trail of data access.


| Assessment Requirement | Applicability |
| --- | --- |
| When audit log buckets are created then verify that server access logging MUST be enabled for the audit log bucket, with logs delivered to a separate, secure logging bucket. |tlp-red<br />tlp-amber<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH01</td>
        </tr>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH09</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>DE.CM-1</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-2</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-3</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.AuditLog.C05

**Export Audit Logs To Bucket**

**Objective:** Configure audit logs to be sent to a external bucket where they can be globally replicated
and can be subject to greater access control and data retention polices.


| Assessment Requirement | Applicability |
| --- | --- |
| When audit logs are exported, then audit logs MUST be present in the configured data location. |tlp-red<br />tlp-amber<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH07</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>PR.PS-04</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-9</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-11</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-4</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.AuditLog.C06

**Enforce Retention Policy on Audit Log Bucket**

**Objective:** Configure a custom retention policy on the designated audit log bucket to ensure that logs are
retained for the correct number of days as defined by your organization&#39;s policy.


| Assessment Requirement | Applicability |
| --- | --- |
| When the retention policy is applied, then data MUST be automatically deleted after the configured number of days. |tlp-red<br />tlp-amber<br />tlp-green<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH06</td>
        </tr>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH07</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>PR.PS-04</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-9</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-11</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.AuditLog.C07

**Enforce MFA Delete on Audit Log Bucket**

**Objective:** Enable Multi-Factor Authentication (MFA) delete on the audit log bucket to
provide greater protection against accidental or malicious deletion of audit data.


| Assessment Requirement | Applicability |
| --- | --- |
| When a standard file deletion is attempted on an object within the audit log bucket, then it MUST be prevented unless MFA is provided. |tlp-red<br />tlp-amber<br />tlp-green<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH06</td>
        </tr>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH07</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>PR.PS-04</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-9</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-11</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.AuditLog.C08

**Enable Object Lock On Audit Log Bucket**

**Objective:** Ensure that object log is enabled globally on all objects with the bucket.
The lock time MUST be configured to meet your organization, legal and compliance goals.
Deletion attempts before the lock period MUST be denied.


| Assessment Requirement | Applicability |
| --- | --- |
| When an attempt is made to delete data before the object lock period expires, then the deletion MUST be denied. |tlp-red<br />tlp-amber<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH07</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>PR.PS-04</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-9</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-11</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.AuditLog.C09

**Restrict Field And Log Type Access**

**Objective:** Configure access to audit logs to follow the principle of least privilege in particular where technically
possible limit the log fields users have access to to prevent accidental exposure to sensitive
information such as PII.


| Assessment Requirement | Applicability |
| --- | --- |
| When restricted fields are accessed by unauthorized users, then those fields MUST remain masked. |tlp-red<br />tlp-amber<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH07</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>PR.PS-04</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AC-6</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-9</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AC-3</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>PT-2</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>PT-3</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>PT-3</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.AuditLog.C10

**Ensure Audit Bucket is Not Publicly Accessible**

**Objective:** Ensure that audit log storage buckets are not publicly accessible to prevent
unauthorized exposure of sensitive log data.


| Assessment Requirement | Applicability |
| --- | --- |
| When audit log storage bucket&#39;s are created then, bucket&#39;s access control settings MUST explicitly deny public read and write access. |tlp-red<br />tlp-amber<br />tlp-green<br /> |
| When the URL of a audit log storage bucket&#39;s object is accessed publicly then, it should be denied by bucket policy. |tlp-red<br />tlp-amber<br />tlp-green<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH01</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>PR.AA-05</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AC-3</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-7</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.C01

**Encrypt Data for Transmission**

**Objective:** Ensure that all communications are encrypted in transit to protect
data integrity and confidentiality.


| Assessment Requirement | Applicability |
| --- | --- |
| When a port is exposed for non-SSH network traffic, all traffic MUST include a TLS handshake AND be encrypted using TLS 1.3 or higher. |tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When a port is exposed for SSH network traffic, all traffic MUST include a SSH handshake AND be encrypted using SSHv2 or higher. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When the service receives unencrypted traffic, then it MUST either block the request or automatically redirect it to the secure equivalent. |tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When a port is exposed, the service MUST ensure that the protocol and service officially assigned to that port number by the IANA Service Name and Transport Protocol Port Number Registry, and no other, is run on that port. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When a service transmits data using TLS, mutual TLS (mTLS) MUST be implemented to require both client and server certificate authentication for all connections. |tlp-amber<br />tlp-red<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH02</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>PR.DS-02</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>IVS-03</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>IVS-07</td>
        </tr>
        <tr>
          <td>ISO_27001</td>
          <td>2013 A.13.1.1</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-8</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-13</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.C02

**Encrypt Data for Storage**

**Objective:** Ensure that all data stored is encrypted at rest using strong
encryption algorithms.


| Assessment Requirement | Applicability |
| --- | --- |
| When data is stored, it MUST be encrypted using the latest industry-standard encryption methods. |tlp-green<br />tlp-amber<br />tlp-red<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH01</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>PR.DS-1</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>DSP-17</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-13</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-28</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.C06

**Restrict Deployments to Trust Perimeter**

**Objective:** Ensure that the service and its child resources are only deployed on
infrastructure in locations that are explicitly included within a
defined trust perimeter.


| Assessment Requirement | Applicability |
| --- | --- |
| When the service is running, its region and availability zone MUST be included in a list of explicitly trusted or approved locations within the trust perimeter. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When a child resource is deployed, its region and availability zone MUST be included in a list of explicitly trusted or approved locations within the trust perimeter. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH03</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>PR.DS-1</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>DSI-06</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>DSI-08</td>
        </tr>
        <tr>
          <td>ISO_27001</td>
          <td>2013 A.11.1.1</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AC-6</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.C08

**Replicate Data to Multiple Locations**

**Objective:** Ensure that data is replicated across multiple physical locations to
protect against data loss due to hardware failures, natural disasters,
or other catastrophic events.


| Assessment Requirement | Applicability |
| --- | --- |
| When data is created or modified, the data MUST have a complete and recoverable duplicate that is stored in a physically separate data center. |tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When data is replicated into a second location, the service MUST be able to accurately represent the replication locations, replication status, and data synchronization status. |tlp-green<br />tlp-amber<br />tlp-red<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH06</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>PR.PT-5</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>BCR-08</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>CP-2</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>CP-10</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.C09

**Ensure Integrity of Access Logs**

**Objective:** Ensure that access logs are always recorded to an external location.


| Assessment Requirement | Applicability |
| --- | --- |
| When the service is operational, its logs and any child resource logs MUST NOT be accessible from the resource they record access to. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When the service is operational, disabling the logs for the service or its child resources MUST NOT be possible without also disabling the corresponding resource. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When the service is operational, any attempt to redirect logs for the service or its child resources MUST NOT be possible without halting operation of the corresponding resource and publishing corresponding events to monitored channels. |tlp-amber<br />tlp-red<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH07</td>
        </tr>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH09</td>
        </tr>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH04</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>PR.DS-6</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-9</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>LOG-02</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>LOG-04</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>LOG-09</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.C10

**Restrict Data Replication to Trust Perimeter**

**Objective:** Ensure that data is only replicated on infrastructure in locations
that are explicitly included within a defined trust perimeter.


| Assessment Requirement | Applicability |
| --- | --- |
| When data is replicated, the service MUST ensure that replication only occurs to destinations that are explicitly included within the defined trust perimeter. |tlp-green<br />tlp-amber<br />tlp-red<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH04</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>PR.DS-5</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>DSP-10</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>DSP-19</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AC-4</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.C11

**Protect Encryption Keys**

**Objective:** Ensure that encryption keys are managed securely by enforcing
the use of approved algorithms, regular key rotation, and
customer-managed encryption keys (CMEKs).


| Assessment Requirement | Applicability |
| --- | --- |
| When encryption keys are used, the service MUST verify that all encryption keys use the latest industry-standard cryptographic algorithms. |tlp-amber<br />tlp-red<br /> |
| When encryption keys are used, the service MUST rotate active keys within 180 days of issuance. |tlp-amber<br /> |
| When encrypting data, the service MUST verify that customer-managed encryption keys (CMEKs) are used. |tlp-amber<br />tlp-red<br /> |
| When encryption keys are accessed, the service MUST verify that access to encryption keys is restricted to authorized personnel and services, following the principle of least privilege. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When encryption keys are used, the service MUST rotate active keys within 365 days of issuance. |tlp-clear<br />tlp-green<br /> |
| When encryption keys are used, the service MUST rotate active keys within 90 days of issuance. |tlp-red<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH16</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>PR.DS-1</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>EKM-02</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>EKM-03</td>
        </tr>
        <tr>
          <td>ISO_27001</td>
          <td>2013 A.10.1.2</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-12</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-17</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.C03

**Implement Multi-factor Authentication (MFA) for Access**

**Objective:** Ensure that all sensitive activities require two or more identity
factors during authentication to prevent unauthorized access.


| Assessment Requirement | Applicability |
| --- | --- |
| When an entity attempts to modify the service through a user interface, the authentication process MUST require multiple identifying factors for authentication. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When an entity attempts to modify the service through an API endpoint, the authentication process MUST require a credential such as an API key or token AND originate from within the trust perimeter. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When an entity attempts to view information on the service through a user interface, the authentication process MUST require multiple identifying factors from the user. |tlp-amber<br />tlp-red<br /> |
| When an entity attempts to view information on the service through an API endpoint, the authentication process MUST require a credential such as an API key or token AND originate from within the trust perimeter. |tlp-amber<br />tlp-red<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH01</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>PR.AC-7</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>IAM-03</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>IAM-08</td>
        </tr>
        <tr>
          <td>ISO_27001</td>
          <td>2013 A.9.4.2</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>IA-2</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.C05

**Prevent Access from Untrusted Entities**

**Objective:** Ensure that secure access controls enforce the principle of least
privilege to restrict access to authorized entities from explicitly
trusted sources only.


| Assessment Requirement | Applicability |
| --- | --- |
| When an attempt is made to modify data on the service or a child resource, the service MUST block requests from unauthorized entities. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When administrative access or configuration change is attempted on the service or a child resource, the service MUST refuse requests from unauthorized entities. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When administrative access or configuration change is attempted on the service or a child resource in a multi-tenant environment, the service MUST refuse requests across tenant boundaries unless the origin is explicitly included in a pre-approved allowlist. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When data is requested from outside the trust perimeter, the service MUST refuse requests from unauthorized entities. |tlp-amber<br />tlp-red<br /> |
| When any request is made from outside the trust perimeter, the service MUST NOT provide any response that may indicate the service exists. |tlp-red<br /> |
| When any request is made to the service or a child resource, the service MUST refuse requests from unauthorized entities. |tlp-green<br />tlp-amber<br />tlp-red<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH01</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>PR.AC-3</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>DS-5</td>
        </tr>
        <tr>
          <td>ISO_27001</td>
          <td>2013 A.13.1.3</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AC-3</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.C04

**Log All Access and Changes**

**Objective:** Ensure that all access attempts are logged to maintain a detailed
audit trail for security and compliance purposes.


| Assessment Requirement | Applicability |
| --- | --- |
| When administrative access or configuration change is attempted on the service or a child resource, the service MUST log the client identity, time, and result of the attempt. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When any attempt is made to modify data on the service or a child resource, the service MUST log the client identity, time, and result of the attempt. |tlp-amber<br />tlp-red<br /> |
| When any attempt is made to read data on the service or a child resource, the service MUST log the client identity, time, and result of the attempt. |tlp-red<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH01</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>DE.AE-3</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>LOG-08</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-2</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-3</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-12</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.C07

**Alert on Unusual Enumeration Activity**

**Objective:** Ensure that logs and associated alerts are generated when
unusual enumeration activity is detected that may indicate
reconnaissance activities.


| Assessment Requirement | Applicability |
| --- | --- |
| When enumeration activities are detected, the service MUST publish an event to a monitored channel which includes the client identity, time, and nature of the activity. |tlp-amber<br />tlp-red<br /> |
| When enumeration activities are detected, the service MUST log the client identity, time, and nature of the activity. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |

<div class="flex-container">
  <div class="flex-item-left">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH15</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex-item-right">
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NIST-CSF</td>
          <td>DE.AE-1</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>LOG-05</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-6</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
