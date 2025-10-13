
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

# CCC.ObjStor v (Object Storage)

Object storage is a data storage architecture that manages data as objects,
rather than as files or blocks. Each object contains the data itself,
metadata, and a unique identifier, making it ideal for storing large amounts
of unstructured data such as multimedia files, backups, and archives. It is
highly scalable and often used in cloud environments due to its flexibility
and accessibility.


<div style="page-break-after: always;"></div>

## Release Details

> 
>
> _- ,  ([](https://github.com/))_

### Contributors to this Release

| Name | Company | GitHub ID |
| ---- | ------- | ------ |

<div style="page-break-after: always;"></div>

## Capabilities

The following capabilities are required to be present on a resource for it to be considered a Object Storage service. Threats outlined later in this catalog are assesssed based on the presence of these capabilities.

- **CCC.Core.F01: Encryption in Transit Enabled by Default**
  
  Provides default encryption of data in transit through SSL or TLS.

- **CCC.Core.F02: Encryption at Rest Enabled by Default**
  
  Provides default encryption of data before storage, with the option for clients to maintain control over the encryption keys.

- **CCC.Core.F03: Access/Activity Logs**
  
  Provides users with the ability to track all requests made to or activities performed on resources for audit purposes.

- **CCC.Core.F04: Transaction Rate Limits**
  
  Allows the setting of a threshold where industry-standard throughput is achieved up to the specified rate limit.

- **CCC.Core.F05: Signed URLs**
  
  Provides the ability to grant temporary or restricted access to a resource through a custom URL that contains authentication information.

- **CCC.Core.F06: Identity Based Access Control**
  
  Provides the ability to determine access to resources based on attributes associated with a user identity.

- **CCC.Core.F07: Event Notifications**
  
  Publishes events for creation, deletion, and modification of objects in a way that enables users to trigger actions in response.

- **CCC.Core.F08: Multi-zone Deployment**
  
  Provides the ability for the service to be deployed in multiple availability zones or regions to increase availability and fault tolerance.

- **CCC.Core.F09: Monitoring**
  
  Provides the ability to continuously observe, track, and analyze the performance, availability, and health of the service resources or applications.

- **CCC.Core.F10: Logging**
  
  Provides the ability to transmit system events, application activities, and/or user interactions to a logging service

- **CCC.Core.F11: Backup**
  
  Provides the ability to create copies of associated data or configurations in the form of automated backups, snapshot-based backups, and/or incremental backups.

- **CCC.Core.F12: Recovery**
  
  Provides the ability to restore data, a system, or an application to a functional state after an incident such as data loss, corruption or a disaster.

- **CCC.Core.F13: Infrastructure as Code**
  
  Allows for managing and provisioning service resources through machine-readable configuration files, such as templates.

- **CCC.Core.F14: API Access**
  
  Allows users to interact programmatically with the service and its resources using APIs, SDKs and CLI.

- **CCC.Core.F15: Cost Management**
  
  Provides the ability to filter spending and to detect cost anomalies for the service.

- **CCC.Core.F16: Budgeting**
  
  Provides the ability to trigger alerts when spending thresholds are approached or exceeded for the service.

- **CCC.Core.F17: Alerting**
  
  Provides the ability to set an alarm based on performance metrics, logs, events or spending thresholds of the service.

- **CCC.Core.F18: Versioning**
  
  Provides the ability to maintain multiple versions of the same resource.

- **CCC.Core.F19: On-demand Scaling**
  
  Provide scaling of resources based on demand.

- **CCC.Core.F20: Tagging**
  
  Provide the ability to tag a resource to effectively manage and gain insights of the resource.

- **CCC.Core.F21: Replication**
  
  Provides the ability to copy data or resource to multiple locations to ensure availability and durability.

- **CCC.Core.F22: Location Lock-In**
  
  Provides the ability to control where the resources are created.

- **CCC.Core.F23: Network Access Rules**
  
  Ability to control access to the resource by defining network access rules.


<div style="page-break-after: always;"></div>

## Threats

The following threats have been identified based upon Object Storage service capabilities. Controls outlined later in this catalog are designed to mitigate these threats. If you are aware of threats to Object Storage services that are not captured here, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the identified threats, which is then followed by an elucidation of each threat and relevant mappings.

|Threat ID|Threat Title|
|----|----|
|CCC.Core.TH01|Access Control is Misconfigured|
|CCC.Core.TH02|Data is Intercepted in Transit|
|CCC.Core.TH03|Deployment Region Network is Untrusted|
|CCC.Core.TH04|Data is Replicated to Untrusted or External Locations|
|CCC.Core.TH05|Data is Corrupted During Replication|
|CCC.Core.TH06|Data is Lost or Corrupted|
|CCC.Core.TH07|Logs are Tampered With or Deleted|
|CCC.Core.TH08|Cost Management Data is Manipulated|
|CCC.Core.TH09|Logs or Monitoring Data are Read by Unauthorized Users|
|CCC.Core.TH10|Alerts are Intercepted|
|CCC.Core.TH11|Event Notifications are Incorrectly Triggered|
|CCC.Core.TH12|Resource Constraints are Exhausted|
|CCC.Core.TH13|Resource Tags are Manipulated|
|CCC.Core.TH14|Older Resource Versions are Exploited|
|CCC.Core.TH15|Automated Enumeration and Reconnaissance by Non-human Entities|
|CCC.Core.TH16|Logging and Monitoring are Disabled|
|CCC.Core.TH17|Unauthorized Network Access via Misconfigured Rules|

---

### CCC.Core.TH01

**Access Control is Misconfigured**

**Description:** Misconfigured access controls may grant excessive privileges or fail to
restrict unauthorized access to sensitive resources. This could result in
unintended data exposure or unauthorized actions being performed within
the system.


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

### CCC.Core.TH02

**Data is Intercepted in Transit**

**Description:** Data transmitted between clients and the service may be susceptible to
interception or modification in transit if encrypted communication is not
properly implemented. This could result in unauthorized access to
sensitive information or unintended data alterations.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F01</li>
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
          <td>T1557</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1040</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.TH03

**Deployment Region Network is Untrusted**

**Description:** Deploying a service in an untrusted, unstable, or insecure location,
the network may be susceptible to unauthorized access or data
interception due to privileged network exposure or physical
vulnerabilities. This could result in unintended data disclosure or
compromised system integrity.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F08</li>
  <li>CCC.Core.F22</li>
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
          <td>T1040</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1110</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1105</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1583</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1557</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.TH04

**Data is Replicated to Untrusted or External Locations**

**Description:** Data may be replicated to untrusted or external locations if replication
configurations are not properly restricted. This could result
in unintended data leakage or exposure outside the organization&#39;s trusted
perimeter.


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

### CCC.Core.TH05

**Data is Corrupted During Replication**

**Description:** Data may become corrupted, delayed, or deleted during replication
processes across regions or availability zones due to misconfigurations
or unintended disruptions. This could lead to compromised data integrity
and availability, potentially affecting recovery processes and system
reliability.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F08</li>
  <li>CCC.Core.F12</li>
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

### CCC.Core.TH06

**Data is Lost or Corrupted**

**Description:** Data loss or corruption may occur due to accidental deletion, or
misconfiguration. This can result in the loss of critical data, service
disruption, or unintended exposure of sensitive information.


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

**Description:** Logs may be tampered with or deleted due to inadequate access controls,
or misconfigurations. This can make it difficult to identify security
incidents, disrupt forensic investigations, and affect the accuracy of
audit trails.


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

### CCC.Core.TH08

**Cost Management Data is Manipulated**

**Description:** Cost management data may be changed due to misconfigurations, or
unauthorized access. This might result in inaccurate resource usage
reporting, budget exhaustion, financial losses, and hinder incident
detection.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F15</li>
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
        <tr>
          <td>T1070</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.TH09

**Logs or Monitoring Data are Read by Unauthorized Users**

**Description:** Unauthorized access to logs or monitoring data may expose valuable
information about the system&#39;s configuration, operations, and security
mechanisms. This could allow for the identification of vulnerabilities,
enable the planning of attacks, or hinder the detection of ongoing
incidents.


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

### CCC.Core.TH10

**Alerts are Intercepted**

**Description:** Event notifications may be intercepted due to misconfigurations,
inadequate security measures, or unauthorized access. This could expose
information about sensitive operations or access patterns, potentially
impacting system security and integrity.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F03</li>
  <li>CCC.Core.F07</li>
  <li>CCC.Core.F09</li>
  <li>CCC.Core.F17</li>
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
          <td>T1057</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1049</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1083</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.TH11

**Event Notifications are Incorrectly Triggered**

**Description:** Event notifications may be triggered incorrectly due to misconfigurations,
or unauthorized access. This could result in sensitive operations being
triggered unintentionally, obfuscate other issues, or overwhelm the
system, potentially disrupting legitimate operations.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F07</li>
  <li>CCC.Core.F17</li>
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
          <td>T1205</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1001.001</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1491.001</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.TH12

**Resource Constraints are Exhausted**

**Description:** Resource constraints, such as memory, CPU, or storage, may be exhausted
due to misconfigurations, or excessive resource consumption. This could
disrupt service availability, deny access to users, or impact other
systems within the same scope. Exhaustion may occur through repeated
requests, resource-intensive operations, or lowering rate/budget limits.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F04</li>
  <li>CCC.Core.F16</li>
  <li>CCC.Core.F19</li>
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
          <td>T1496</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1499</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1498</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.TH13

**Resource Tags are Manipulated**

**Description:** Resource tags may be altered, leading to changes in organizational
policies, billing disruptions, or unintended exposure of sensitive data.
This could result in mismanaged resources, financial misuse, or security
vulnerabilities.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F20</li>
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

### CCC.Core.TH14

**Older Resource Versions are Exploited**

**Description:** Older versions of resources may contain vulnerabilities due to deprecated
or insecure configurations. Without proper version control and monitoring,
outdated versions could lead to security measures bypass, potentially
leading to security risks or operational disruptions.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
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
          <td>T1027</td>
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
          <td>T1489</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1562.01</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1027</td>
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
          <td>T1489</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.TH15

**Automated Enumeration and Reconnaissance by Non-human Entities**

**Description:** Automated processes or bots may be used to perform reconnaissance by
enumerating resources such as APIs, file systems, or directories. These
activities can reveal potential vulnerabilities, misconfigurations, or
unsecured resources, which might result in unauthorized access or data
exposure.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F14</li>
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
          <td>T1580</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Core.TH16

**Logging and Monitoring are Disabled**

**Description:** Logging and monitoring may be disabled, potentially hindering the
detection of security events and reducing visibility into system
activities. This condition can impact the organization&#39;s ability
to investigate incidents and maintain operational integrity.


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

### CCC.Core.TH17

**Unauthorized Network Access via Misconfigured Rules**

**Description:** Improperly configured or overly permissive network access rules
such as security groups can allow unauthorized inbound connections
to the service. This could result in unauthorized access to sensitive
resources or data and disruption to service availability.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F23</li>
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
          <td>T1046</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1133</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>


<div style="page-break-after: always;"></div>

## Controls

The following controls have been designed to mitigate the aforementioned threats that have been identified for CCC.ObjStor. Each control includes one or more Assessment Requirements that should always pass for a service to be considered compliant with this control catalog. If your experience can help improve these controls, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the controls, which is then followed by an elucidation of each control and relevant mappings.

|Control ID|Control Title|
|----|----|
|CCC.Core.CN01|Prevent Unencrypted Requests|
|CCC.Core.CN06|Prevent Deployment in Restricted Regions|
|CCC.Core.CN08|Enable Multi-zone or Multi-region Data Replication|
|CCC.Core.CN09|Prevent Tampering, Deletion, or Unauthorized Access to Access Logs|
|CCC.Core.CN10|Prevent Data Replication to Destinations Outside of Defined Trust Perimeter|
|CCC.Core.CN02|Ensure Data Encryption at Rest for All Stored Data|
|CCC.Core.CN11|Enforce Key Management Policies|
|CCC.Core.CN03|Implement Multi-factor Authentication (MFA) for Access|
|CCC.Core.CN05|Prevent Access from Untrusted Entities|
|CCC.Core.CN04|Log All Access and Changes|
|CCC.Core.CN07|Alert on Unusual Enumeration Activity|
|CCC.Core.CN12|Ensure Secure Network Access Rules|

### CCC.Core.CN01

**Prevent Unencrypted Requests**

**Objective:** Ensure that all communications are encrypted in transit to protect data
integrity and confidentiality.


| Assessment Requirement | Applicability |
| --- | --- |
| When a port is exposed for non-SSH network traffic, all traffic MUST include a TLS handshake AND be encrypted using TLS 1.2 or higher. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When a port is exposed for SSH network traffic, all traffic MUST include a SSH handshake AND be encrypted using SSHv2 or higher. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |

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

### CCC.Core.CN06

**Prevent Deployment in Restricted Regions**

**Objective:** Ensure that resources are not provisioned or deployed in
geographic regions or cloud availability zones that have been
designated as restricted or prohibited, to comply with
regulatory requirements and reduce exposure to geopolitical
risks.


| Assessment Requirement | Applicability |
| --- | --- |
| When a deployment request is made, the service MUST validate that the deployment region is not to a restricted or regions or availability zones. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When a deployment request is made, the service MUST validate that replication of data, backups, and disaster recovery operations will not occur in restricted regions or availability zones. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |

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

### CCC.Core.CN08

**Enable Multi-zone or Multi-region Data Replication**

**Objective:** Ensure that data is replicated across multiple
zones or regions to protect against data loss due to hardware
failures, natural disasters, or other catastrophic events.


| Assessment Requirement | Applicability |
| --- | --- |
| When data is stored, the service MUST ensure that data is replicated across multiple availability zones or regions. |tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When data is replicated across multiple zones or regions, the service MUST be able to verify the replication state, including the replication locations and data synchronization status. |tlp-green<br />tlp-amber<br />tlp-red<br /> |

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

### CCC.Core.CN09

**Prevent Tampering, Deletion, or Unauthorized Access to Access Logs**

**Objective:** Access logs should always be considered sensitive.
Ensure that access logs are protected against unauthorized
access, tampering, or deletion.


| Assessment Requirement | Applicability |
| --- | --- |
| When access logs are stored, the service MUST ensure that access logs cannot be accessed without proper authorization. |tlp-amber<br />tlp-red<br />tlp-green<br />tlp-clear<br /> |
| When access logs are stored, the service MUST ensure that access logs cannot be modified without proper authorization. |tlp-amber<br />tlp-red<br />tlp-green<br />tlp-clear<br /> |
| When access logs are stored, the service MUST ensure that access logs cannot be deleted without proper authorization. |tlp-amber<br />tlp-red<br />tlp-green<br />tlp-clear<br /> |

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

### CCC.Core.CN10

**Prevent Data Replication to Destinations Outside of Defined Trust Perimeter**

**Objective:** Prevent replication of data to untrusted destinations outside
of defined trust perimeter. An untrusted destination is defined
as a resource that exists outside of a specified trusted
identity or network or data perimeter.


| Assessment Requirement | Applicability |
| --- | --- |
| When data is replicated, the service MUST ensure that replication is restricted to explicitly trusted destinations. |tlp-green<br />tlp-amber<br />tlp-red<br /> |

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

### CCC.Core.CN02

**Ensure Data Encryption at Rest for All Stored Data**

**Objective:** Ensure that all data stored is encrypted at rest to maintain
confidentiality and integrity.


| Assessment Requirement | Applicability |
| --- | --- |
| When data is stored at rest, the service MUST be configured to encrypt data at rest using the latest industry-standard encryption methods. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |

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

### CCC.Core.CN11

**Enforce Key Management Policies**

**Objective:** Ensure that encryption keys are managed securely by enforcing
the use of approved algorithms, regular key rotation, and
customer-managed encryption keys (CMEKs).


| Assessment Requirement | Applicability |
| --- | --- |
| When encryption keys are used, the service MUST verify that all encryption keys use approved cryptographic algorithms as per organizational standards. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When encryption keys are used, the service MUST verify that encryption keys are rotated at a frequency compliant with organizational policies. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When encrypting data, the service MUST verify that customer-managed encryption keys (CMEKs) are used. |tlp-amber<br />tlp-red<br /> |
| When encryption keys are accessed, the service MUST verify that access to encryption keys is restricted to authorized personnel and services, following the principle of least privilege. |tlp-amber<br />tlp-red<br /> |

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

### CCC.Core.CN03

**Implement Multi-factor Authentication (MFA) for Access**

**Objective:** Ensure that all sensitive activities require two or more identity factors
during authentication to prevent unauthorized access. This may include
something you know, something you have, or something you are. In the
case of programattically accessible services, such as API endpoints, this
includes a combination of API keys or tokens and network restrictions.


| Assessment Requirement | Applicability |
| --- | --- |
| When an entity attempts to modify the service, the service MUST attempt to verify the client&#39;s identity through an authentication process. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When an entity attempts to view information presented by the service, service, the service MUST attempt to verify the client&#39;s identity through an authentication process. |tlp-amber<br />tlp-red<br /> |
| When an entity attempts to view information on the service through a user interface, the authentication process MUST require multiple identifying factors from the user. |tlp-amber<br />tlp-red<br /> |
| When an entity attempts to modify the service through an API endpoint, the authentication process MUST be limited to a specific allowed network. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When an entity attempts to view information on the service through an API endpoint, the authentication process MUST be limited to a specific allowed network. |tlp-amber<br />tlp-red<br /> |
| When an entity attempts to modify the service through a user interface, the authentication process MUST require multiple identifying factors from the user. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |

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

### CCC.Core.CN05

**Prevent Access from Untrusted Entities**

**Objective:** Ensure that secure access controls prevent unauthorized access,
mitigate risks of data exfiltration, and block misuse of services
by adversaries. This includes restricting access based on trust
criteria such as IP allowlists, domain restrictions, and tenant
isolation.


| Assessment Requirement | Applicability |
| --- | --- |
| When access to sensitive resources is attempted, the service MUST block requests from untrusted sources, including IP addresses, domains, or networks that are not explicitly included in a pre-approved allowlist. |tlp-amber<br />tlp-red<br /> |
| When administrative access is attempted, the service MUST validate that the request originates from an explicitly allowed source as defined in the allowlist. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When resources are accessed in a multi-tenant environment, the service MUST enforce isolation by allowing access only to explicitly allowlisted tenants. |tlp-amber<br />tlp-red<br /> |
| When an access attempt from an untrusted source is blocked, the service MUST log the event, including the source details, time, and reason for denial. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |

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

### CCC.Core.CN04

**Log All Access and Changes**

**Objective:** Ensure that all access and changes are logged to maintain a
detailed audit trail for security and compliance purposes.


| Assessment Requirement | Applicability |
| --- | --- |
| When any access attempt is made to the service, the service MUST log the client identity, time, and result of the attempt. |tlp-amber<br />tlp-red<br /> |
| When any access attempt is made to the view sensitive information, the service MUST log the client identity, time, and result of the attempt. |tlp-amber<br />tlp-red<br /> |
| When any change is made to the service configuration, the service MUST log the change, including the client, time, previous state, and the new state following the change. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |

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

### CCC.Core.CN07

**Alert on Unusual Enumeration Activity**

**Objective:** Ensure that logs and associated alerts are generated when
unusual enumeration activity is detected that may indicate
reconnaissance activities.


| Assessment Requirement | Applicability |
| --- | --- |
| When suspicious enumeration activities are detected, the service MUST generate real-time alerts to notify security personnel. |tlp-red<br /> |
| When suspicious enumeration activities are detected, the service MUST log the event, including the source details, time, and nature of the activity. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |

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

### CCC.Core.CN12

**Ensure Secure Network Access Rules**

**Objective:** Ensure network access to the service is restricted to explicitly
authorized IP addresses, ports, and protocols by properly
configuring security group and/or firewall rules. Configuration
must follow the principle of least privilege to minimize the
attack surface and prevent unauthorized  inbound connections.
Overly permissive rules such as, 0.0.0.0/0 must be disallowed or
strictly controlled.


| Assessment Requirement | Applicability |
| --- | --- |
| When an unauthorized IP or network attempts to connect to the service, the request MUST be denied. |tlp-red<br />tlp-amber<br /> |

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
          <td>CCC.Core.TH17</td>
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
          <td>NIST_800_53</td>
          <td>AC-4</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
