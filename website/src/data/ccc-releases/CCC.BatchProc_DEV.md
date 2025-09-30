
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

# CCC.BatchProc vDEV (Batch Processing)

This documents the minimal set of capabilities that should be present
for a batch processing service to be considered for use in financial
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

The following capabilities are required to be present on a resource for it to be considered a Batch Processing service. Threats outlined later in this catalog are assesssed based on the presence of these capabilities.

- **CCC.BatchProc.F01: Data Processing**
  
  Processing large volumes of data or time consuming operations in batches (groups) without requiring user interaction during execution.

- **CCC.BatchProc.F02: Job Scheduling**
  
  Allows workloads to be executed base on a schedules.

- **CCC.BatchProc.F03: Event Triggers**
  
  Allows workloads to be executed base on an event.

- **CCC.BatchProc.F04: Manual Triggers**
  
  Ability to trigger a job manually when needed.

- **CCC.BatchProc.F05: Dynamic Resource Allocation**
  
  Automatically provision computing resources based on job requirements at the start of execution and deallocate them once the job is completed.

- **CCC.BatchProc.F06: VPC Support**
  
  Ability to deploy compute resources in your VPC for network isolation.

- **CCC.BatchProc.F07: Job Definitions**
  
  Defines job configurations, including compute resources, environment variables, and execution parameters.

- **CCC.BatchProc.F08: Job Queues**
  
  Ability to organize jobs into queues with execution priorities.

- **CCC.BatchProc.F09: Job Dependencies**
  
  Ability to define dependencies between jobs to execute them in a specific order.

- **CCC.BatchProc.F10: Job Orchestration**
  
  Ability to coordinate and manage the execution of multiple jobs to ensure they run in order based on conditions to meet performance or business requirements.

- **CCC.BatchProc.F11: Multinode Parallel Jobs**
  
  Support for running HPC (High Performance Computing) workloads that span multiple computing instances.

- **CCC.BatchProc.F12: Array Jobs**
  
  Ability to run a single job across multiple data inputs or parameters concurrently.

- **CCC.BatchProc.F13: Container Support**
  
  Native support for containerized workloads using Docker containers.

- **CCC.BatchProc.F14: Retry Policy**
  
  Ability to configure retry logic for failed jobs.

- **CCC.BatchProc.F15: Integration with Data Sources and Sinks**
  
  Seamlessly integrates with various data sources (for reading inputs) and data sinks (for storing outputs) such as object storage, databases, data streams and data warehouses.

- **CCC.BatchProc.F16: List Jobs**
  
  Ability to list the jobs with their job status such as succeeded, failed, running, pending or submitted.

- **CCC.BatchProc.F17: Cancel Jobs**
  
  Ability to cancel jobs that are in submitted, pending or runnable states.

- **CCC.BatchProc.F18: Terminate Jobs**
  
  Ability to terminate jobs that are already running.

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

The following threats have been identified based upon Batch Processing service capabilities. Controls outlined later in this catalog are designed to mitigate these threats. If you are aware of threats to Batch Processing services that are not captured here, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the identified threats, which is then followed by an elucidation of each threat and relevant mappings.

|Threat ID|Threat Title|
|----|----|
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

---

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


<div style="page-break-after: always;"></div>

## Controls

The following controls have been designed to mitigate the aforementioned threats that have been identified for CCC.BatchProc. Each control includes one or more Assessment Requirements that should always pass for a service to be considered compliant with this control catalog. If your experience can help improve these controls, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the controls, which is then followed by an elucidation of each control and relevant mappings.

|Control ID|Control Title|
|----|----|
