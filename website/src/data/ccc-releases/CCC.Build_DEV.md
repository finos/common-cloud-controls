
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

# CCC.Build vDEV (Build)

This documents the minimal set of capabilities that should be present
for a build service to be considered for use in financial
services ecosystems.


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

The following capabilities are required to be present on a resource for it to be considered a Build service. Threats outlined later in this catalog are assesssed based on the presence of these capabilities.

- **CCC.Build.F01: Build Automation**
  
  Provides fully managed continuous integration service that compiles source code, run tests and produce software packages based on triggers or schedules.

- **CCC.Build.F02: CI/CD Pipelines**
  
  Provides or integrates with continuous integration and continuous delivery/deployment (CI/CD) services.

- **CCC.Build.F03: Source Repository Integration**
  
  Integrates with cloud native or external source code repositories such as GitHub, Bitbucket, GitLab to trigger builds on code changes.

- **CCC.Build.F04: Artifact Storage**
  
  Ability to securely store build artifacts for later use.

- **CCC.Build.F05: Multi-language Support**
  
  Provides pre-configured build environments for popular programming languages such as Java, Python, Node.js, .NET, etc.

- **CCC.Build.F06: Custom Build Environments**
  
  Allows custom build environments by specifying the operating system, runtime, or providing a custom docker runtime image.

- **CCC.Build.F07: Build Docker Image**
  
  Support for building docker container images in the pipelines.

- **CCC.Build.F08: Environment Variables**
  
  Ability to set environment variables within the build project.

- **CCC.Build.F09: Concurrent Builds**
  
  Support for concurrent, parallel builds to improve build performance.

- **CCC.Build.F10: Caching**
  
  Caching of dependencies between builds for faster builds.

- **CCC.Build.F11: Realtime Build Logs**
  
  Providing the ability to monitor builds and view logs in the real-time.

- **CCC.Build.F12: List and View Builds**
  
  Ability to list, view logs and download artifacts of old builds.

- **CCC.Core.F01: Encryption in Transit Enabled by Default**
  
  The service automatically encrypts all data using industry-standard cryptographic protocols prior to transmission via a network interface.

- **CCC.Core.F02: Encryption at Rest Enabled by Default**
  
  The service automatically encrypts all data using industry-standard cryptographic protocols prior to being written to a storage medium.

- **CCC.Core.F04: Transaction Rate Limits**
  
  The service always provides industry-standard network throughput up to a user-specified rate limit, beyond which excess requests may be throttled, delayed, or rejected.

- **CCC.Core.F06: Access Control**
  
  The service automatically enforces user configurations to restrict or allow access to a specific component or a child resource based on factors such as user identities, roles, groups, or attributes.

- **CCC.Core.F07: Event Publication**
  
  The service automatically publishes a structured state-change record upon creation, deletion, or modification of data, configuration, components, or child resources.

- **CCC.Core.F09: Metrics Publication**
  
  The service automatically publishes structured, numeric, time-series data points related to the performance, availability, and health of the service or its child resources.

- **CCC.Core.F10: Log Publication**
  
  The service automatically publishes structured, verbose records of activities, operations, or events that occur within the service.

- **CCC.Core.F14: API Access**
  
  The service exposes a port enabling external actors to interact programmatically with the service and its resources using HTTP protocol methods such as GET, POST, PUT, and DELETE.

- **CCC.Core.F19: Resource Scaling**
  
  The service may be configured to scale child resources automatically or on-demand.


<div style="page-break-after: always;"></div>

## Threats

The following threats have been identified based upon Build service capabilities. Controls outlined later in this catalog are designed to mitigate these threats. If you are aware of threats to Build services that are not captured here, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the identified threats, which is then followed by an elucidation of each threat and relevant mappings.

|Threat ID|Threat Title|
|----|----|
|CCC.Build.TH01|Unauthorized Build Execution|
|CCC.Build.TH02|External Exposure of Build Environments|
|CCC.Core.TH01|Access Control is Misconfigured|
|CCC.Core.TH02|Data is Intercepted in Transit|
|CCC.Core.TH03|Deployment Region Network is Untrusted|
|CCC.Core.TH04|Data is Replicated to Untrusted or External Locations|
|CCC.Core.TH05|Interference with Replication Processes|
|CCC.Core.TH06|Data is Lost or Corrupted|
|CCC.Core.TH07|Logs are Tampered With or Deleted|
|CCC.Core.TH09|Runtime Logs are Read by Unauthorized Entities|
|CCC.Core.TH11|Publications are Incorrectly Triggered|
|CCC.Core.TH12|Resource Constraints are Exhausted|
|CCC.Core.TH14|Older Resource Versions are Used|
|CCC.Core.TH15|Automated Enumeration and Reconnaissance by Non-human Entities|
|CCC.Core.TH16|Publications are Disabled|

---

### CCC.Build.TH01

**Unauthorized Build Execution**

**Description:** Attackers may trigger builds using unauthorized build agents or external services,
leading to unauthorized code execution or deployment of malicious code.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Build.F01</li>
  <li>CCC.Build.F04</li>
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
          <td>T1195</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Build.TH02

**External Exposure of Build Environments**

**Description:** If build environments have external network access, they may be accessed by unauthorized parties,
leading to data exfiltration or tampering.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Build.F03</li>
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
          <td>T1133</td>
          <td>MITRE-ATT&amp;CK</td>
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

### CCC.Core.TH02

**Data is Intercepted in Transit**

**Description:** Data transmitted by the service is susceptible to collection by any entity
with access to any part of the transmission path. Packet observations can
be used to support the planning of attacks by profiling origin points,
destinations, and usage patterns. The data may also be vulnerable to
interception or modification in transit if not properly encrypted,
impacting the confidentiality or integrity of the transmitted data.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
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

**Description:** Systems are susceptible to unauthorized access or interception by actors
with social or physical control over the network in which they are
deployed. If the geopolitical status of the deployment network is
untrusted, unstable, or insecure, this could result in a loss of
confidentiality, integrity, or availability of the service and its data.


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

### CCC.Core.TH05

**Interference with Replication Processes**

**Description:** Misconfigured or manipulated replication processes may lead to data being
copied to unintended locations, delayed, modified, or not being copied
at all. This could lead to compromised data confidentiality and integrity,
potentially also affecting recovery processes and data availability.


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

### CCC.Core.TH11

**Publications are Incorrectly Triggered**

**Description:** Incorrectly triggered publications may disseminate inaccurate
or misleading information, creating a data integrity risk. Such
misinformation can cause unintended operations to be initiated,
conceal legitimate issues, and disrupt the availability or reliability
of systems and their data.


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

**Description:** Exceeding the resource constraints through excessive consumption,
resource-intensive operations, or lowering of rate-limit thresholds
can impact the availability of elements such as memory, CPU, or storage.
This may disrupt availability of the service or child resources by
denying the associated functionality to users. If the impacted system is
not designed to expect such a failure, the effect could also cascade to
other services and resources.


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

### CCC.Core.TH14

**Older Resource Versions are Used**

**Description:** Running older versions of child resources can expose the system to known
vulnerabilities that have been addressed in more recent versions. If the
version identifier is detected by an attacker, it may be possible to
exploit these vulnerabilities to compromise the confidentiality,
integrity, or availability of the system and its data.


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

**Description:** Automated processes may be used to gather details about service and
child resource elements such as APIs, file systems, or directories.
This information can reveal vulnerabilities, misconfigurations,
and the network topology, which can be used to plan an attack against
the system, the service, or its child resources.


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

The following controls have been designed to mitigate the aforementioned threats that have been identified for CCC.Build. Each control includes one or more Assessment Requirements that should always pass for a service to be considered compliant with this control catalog. If your experience can help improve these controls, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the controls, which is then followed by an elucidation of each control and relevant mappings.

|Control ID|Control Title|
|----|----|
|CCC.Build.C01|Restrict Allowed Build Agents|
|CCC.Build.C02|Restrict Allowed External Services for Build Triggers|
|CCC.Build.C03|Deny External Network Access for Build Environments|
|CCC.Core.C01|Encrypt Data for Transmission|
|CCC.Core.C02|Encrypt Data for Storage|
|CCC.Core.C09|Ensure Integrity of Access Logs|
|CCC.Core.C10|Restrict Data Replication to Trust Perimeter|
|CCC.Core.C04|Log All Access and Changes|
|CCC.Core.C05|Prevent Access from Untrusted Entities|

### CCC.Build.C01

**Restrict Allowed Build Agents**

**Objective:** Ensure that builds are executed only on authorized build agents to maintain
control over the build environment and prevent unauthorized code execution.


| Assessment Requirement | Applicability |
| --- | --- |
| Attempt to initiate a build using an unauthorized build agent and verify that the build is rejected. |tlp-red<br />tlp-amber<br /> |

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
          <td>PR.AC-4</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AC-3</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AC-6</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Build.C02

**Restrict Allowed External Services for Build Triggers**

**Objective:** Ensure that builds can only be triggered by authorized external services or
repositories to prevent unauthorized code execution or tampering.


| Assessment Requirement | Applicability |
| --- | --- |
| Attempt to trigger a build from an unauthorized external service or repository and verify that the build does not start. |tlp-red<br />tlp-amber<br /> |

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
          <td>PR.AC-4</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AC-3</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AC-6</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.Build.C03

**Deny External Network Access for Build Environments**

**Objective:** Ensure that build environments do not have external network access to
prevent unauthorized external access and data exfiltration.


| Assessment Requirement | Applicability |
| --- | --- |
| Attempt to access the build environment from an external network and verify that access is denied. |tlp-red<br />tlp-amber<br /> |

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
        <tr>
          <td>CCC</td>
          <td>CCC.Core.TH05</td>
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
          <td>PR.AC-5</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-7</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-5</td>
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
