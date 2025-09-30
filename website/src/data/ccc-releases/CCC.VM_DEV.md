
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

# CCC.VM vDEV (CCC Virtual Machines)

This documents the minimal set of capabilities that should be present for a
virtual machine service to be considered for use in financial services ecosystems.


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

The following capabilities are required to be present on a resource for it to be considered a CCC Virtual Machines service. Threats outlined later in this catalog are assesssed based on the presence of these capabilities.

- **CCC.VM.F01: General Purpose Instances**
  
  Provides a computing instance that provides a balance of compute, memory and networking resources. They are suitable for a wide range of applications.

- **CCC.VM.F02: Compute Optimized Instances**
  
  Provides instances that are suited for compute-bound applications that benefits from high performance processors such as batch processing workloads, media transcoding and high performance web servers.

- **CCC.VM.F03: Memory Optimized Instances**
  
  Provides instances that are suited for memory intensive applications such as high performance databases, in-memory caches, and real-time big data analytics.

- **CCC.VM.F04: Storage Optimized Instances**
  
  Provides instances that are optimized for applications that require high, sequential read and write access to large datasets on local storage such as distributed file systems, data warehousing applications, and high-frequency online transaction processing (OLTP) systems.

- **CCC.VM.F05: Accelerated Computing Instances**
  
  Provides instances that use hardware accelerator, or co-processors, such as GPU to perform functions such as floating-point number calculations, graphics processing, or data pattern matching more efficiently.

- **CCC.VM.F06: Preemptible Instances**
  
  Providing the option for using preemptible virtual machine (spot) instances at a lower cost for non-critical or fault-tolerant workloads that may be terminated by the cloud provider after a notice period.

- **CCC.VM.F07: Dedicated Instances**
  
  Ability to reserve a physical server dedicated to a single customer for regulatory compliance.

- **CCC.VM.F08: Vertical Scaling**
  
  Ability to increase or decrease resources such as cpu, memory, and storage of an existing virtual machine instance.

- **CCC.VM.F09: Horizontal Scaling**
  
  Ability to add or remove VM instances assigned to the application to handle increased or decreased workload.

- **CCC.VM.F10: VM Images**
  
  Provides templates to create new virtual machines. They usually includes operating system, configuration settings and installed applications.

- **CCC.VM.F11: Custom Images**
  
  Ability to create virtual machines with images what are created and owned by the customer which are only available within the subscription of the customer.

- **CCC.VM.F12: Interoperability with Storage Options**
  
  Capability to read/write to non-ephemeral external storage including object storage and encrypted block storage.

- **CCC.VM.F13: Patch Management**
  
  Offering patch management services and compatibility with third-party patch management tools to keep virtual machine instances up to date with security patches and updates.

- **CCC.VM.F14: Isolated Secure Environments**
  
  Providing an isolated &#34;enclave&#34; within a virtual machine for processing highly sensitive data such as personal identifiable information, healthcare data and intellectual property. These enclaves are fully isolated from the parent EC2 instance, with no persistent storage, no interactive access, and no external networking.

- **CCC.VM.F15: Nested Virtualization**
  
  Ability to create and manage virtual machines within instances.

- **CCC.VM.F16: Instance Metadata**
  
  Providing metadata about virtual machine instances for configuration and management purposes.

- **CCC.VM.F17: Instance Snapshots**
  
  Creation of snapshots of virtual machine instances to capture and preserve state and data for backup and cloning purposes.

- **CCC.VM.F18: Instance Templates**
  
  Offering templates for provisioning virtual machine instances with pre-configured images, instance types, and network configurations.

- **CCC.VM.F19: Bootstrap Scripts**
  
  Ability to provide bootstrap scripts to a VM to run during the instance boot process.

- **CCC.VM.F20: Instance Affinity/Anti-affinity**
  
  Enabling control over the location of virtual machine instances to ensure or prevent co-location on the same physical hardware.

- **CCC.VM.F21: Instance Health Checks**
  
  Exposing health checks on virtual machine instances so that unhealthy instances can be automatically replaced or repaired.

- **CCC.VM.F22: Instance Remote Access**
  
  Offering remote access to virtual machine instances through methods such as SSH or RDP for troubleshooting, debugging, and maintenance purposes.

- **CCC.VM.F23: Instance Live Migration**
  
  Ability to perform live migration of virtual machine instances between physical hosts for maintenance or load balancing purposes without downtime.

- **CCC.VM.F24: TPM Support**
  
  Providing support for Trusted Platform Module (TPM) for hardware-based security capabilities such as secure boot and cryptographic key storage.

- **CCC.Core.F02: Encryption at Rest Enabled by Default**
  
  The service automatically encrypts all data using industry-standard cryptographic protocols prior to being written to a storage medium.

- **CCC.Core.F06: Access Control**
  
  The service automatically enforces user configurations to restrict or allow access to a specific component or a child resource based on factors such as user identities, roles, groups, or attributes.

- **CCC.Core.F07: Event Publication**
  
  The service automatically publishes a structured state-change record upon creation, deletion, or modification of data, configuration, components, or child resources.

- **CCC.Core.F09: Metrics Publication**
  
  The service automatically publishes structured, numeric, time-series data points related to the performance, availability, and health of the service or its child resources.

- **CCC.Core.F10: Log Publication**
  
  The service automatically publishes structured, verbose records of activities, operations, or events that occur within the service.

- **CCC.Core.F11: Backup**
  
  The service can generate copies of its data or configurations in the form of automated backups, snapshot-based backups, or incremental backups.

- **CCC.Core.F12: Recovery**
  
  The service can be reverted to a previous state by providing a compatible backup or snapshot identifier.

- **CCC.Core.F15: Cost Management**
  
  The service monitors data published by child or networked resources to infer usage patterns and generate cost reports for the service.

- **CCC.Core.F17: Alerting**
  
  The service may be configured to emit a notification based on a user-defined condition related to the data published by a child or networked resource.

- **CCC.Core.F20: Resource Tagging**
  
  The service provides users with the ability to tag a child resource with metadata that can be reviewed or queried.

- **CCC.Core.F22: Location Lock-In**
  
  The service may be configured to restrict the deployment of child resources to specific geographic locations.

- **CCC.Core.F23: Network Access Rules**
  
  The service restricts access to child or networked resources based on user-defined network parameters such as IP address, protocol, port, or source.


<div style="page-break-after: always;"></div>

## Threats

The following threats have been identified based upon CCC Virtual Machines service capabilities. Controls outlined later in this catalog are designed to mitigate these threats. If you are aware of threats to CCC Virtual Machines services that are not captured here, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the identified threats, which is then followed by an elucidation of each threat and relevant mappings.

|Threat ID|Threat Title|
|----|----|
|CCC.VM.TH01|Images Contain Vulnerabilities|
|CCC.VM.TH02|Instance Metadata is Unprotected|
|CCC.VM.TH03|Bootstrap Scripts Introduce Unintended Behavior|
|CCC.VM.TH04|Instance Templates Propagate Insecure Defaults|
|CCC.VM.TH05|Network Access Rules Allow Unintended Communication|
|CCC.VM.TH06|Remote Access Interfaces Are Insufficiently Restricted|
|CCC.VM.TH07|Resource Starvation Through Preemptible (spot) VM Termination|
|CCC.VM.TH08|Co-Residency Risk on Non-Dedicated Infrastructure|
|CCC.VM.TH09|Misconfigured Vertical Scaling Leads to Privilege Escalation|
|CCC.VM.TH10|Auto-Scaling Abuse for Resource Exhaustion|
|CCC.VM.TH11|VM Image Tampering or Poisoning|
|CCC.Core.TH01|Access Control is Misconfigured|
|CCC.Core.TH03|Deployment Region Network is Untrusted|
|CCC.Core.TH05|Interference with Replication Processes|
|CCC.Core.TH06|Data is Lost or Corrupted|
|CCC.Core.TH07|Logs are Tampered With or Deleted|
|CCC.Core.TH08|Runtime Metrics are Manipulated|
|CCC.Core.TH09|Runtime Logs are Read by Unauthorized Entities|
|CCC.Core.TH10|State-change Events are Read by Unauthorized Entities|
|CCC.Core.TH11|Publications are Incorrectly Triggered|
|CCC.Core.TH13|Resource Tags are Manipulated|
|CCC.Core.TH16|Publications are Disabled|

---

### CCC.VM.TH01

**Images Contain Vulnerabilities**

**Description:** Virtual machine images may include outdated software, insecure
configurations, or secrets. Use of such images can introduce
vulnerabilities into environments where they are deployed.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.VM.F11</li>
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
          <td>T1601</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1584.001</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.VM.TH02

**Instance Metadata is Unprotected**

**Description:** Instance metadata services may be exposed within virtual machines without
appropriate access controls, allowing unauthorized retrieval of sensitive
configuration details or temporary credentials.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.VM.F16</li>
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
          <td>T1552.005</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.VM.TH03

**Bootstrap Scripts Introduce Unintended Behavior**

**Description:** Bootstrap scripts executed at startup may include unvalidated commands or
configuration changes. If not securely managed, these scripts can modify
instance behavior in unexpected or insecure ways.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.VM.F19</li>
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
          <td>T1204</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1059.004</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.VM.TH04

**Instance Templates Propagate Insecure Defaults**

**Description:** Instance templates may contain hardcoded credentials, open ports, or
insecure configurations. When reused across deployments, these templates
can replicate vulnerabilities at scale.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.VM.F18</li>
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
          <td>T1601.002</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.VM.TH05

**Network Access Rules Allow Unintended Communication**

**Description:** Inadequately scoped network access rules may permit communication between
virtual machines and untrusted networks or services, increasing exposure
to unauthorized access and lateral movement.


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
          <td>T1021</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1071</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.VM.TH06

**Remote Access Interfaces Are Insufficiently Restricted**

**Description:** Virtual machine instances may expose remote access methods such as SSH or
RDP without proper access controls or network restrictions, allowing
unintended access to administrative interfaces.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.VM.F22</li>
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
          <td>T1021.001</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1078</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.VM.TH07

**Resource Starvation Through Preemptible (spot) VM Termination**

**Description:** Workloads running on preemptible (spot) instances may experience unexpected termination
by the cloud provider with minimal notice. This can result in workload instability, leading
to service degradation or denial-of-service if critical processes are scheduled on such VMs,
potentially impacting system reliability and availability.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.VM.F06</li>
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
          <td>T1499</td>
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

### CCC.VM.TH08

**Co-Residency Risk on Non-Dedicated Infrastructure**

**Description:** Virtual machines operating on shared infrastructure, rather than dedicated instances, may be
exposed to increased risk of side-channel or cross-VM activities. This can result in data
leakage or memory scraping, potentially compromising data confidentiality and system integrity.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.VM.F07</li>
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
          <td>T1203</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.VM.TH09

**Misconfigured Vertical Scaling Leads to Privilege Escalation**

**Description:** Inadequate permissions or automation logic in vertical scaling processes may allow unauthorized
resource escalation, such as adding CPUs or memory. This can result in elevated access rights,
increased computational capacity for unintended actions, or unplanned cost increases, potentially
affecting system security and operational control.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.VM.F08</li>
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
          <td>T1068</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1578.002</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.VM.TH10

**Auto-Scaling Abuse for Resource Exhaustion**

**Description:** Automated horizontal scaling mechanisms may be manipulated through forced load generation, such
as distributed denial-of-service events, triggering excessive VM creation. This can lead to
billing anomalies, service instability, or disruption of resource quotas, potentially impacting
cost management and service availability.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.VM.F09</li>
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
      </tbody>
    </table>
  </div>
</div>

### CCC.VM.TH11

**VM Image Tampering or Poisoning**

**Description:** Virtual machine images may be created or modified to include backdoors, malware, or misconfigurations.
The deployment of compromised images can propagate threats across cloud infrastructure, potentially
affecting data integrity, confidentiality, and system reliability.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.VM.F10</li>
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
          <td>T1584</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1204</td>
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

### CCC.Core.TH08

**Runtime Metrics are Manipulated**

**Description:** Manipulation of runtime metrics can lead to inaccurate representations of
system performance and resource utilization. This compromised data
integrity may also impact system availability through misinformed scaling
decisions, budget exhaustion, financial losses, and hindered incident
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

### CCC.Core.TH10

**State-change Events are Read by Unauthorized Entities**

**Description:** Unauthorized access to state-change events can reveal information about
the system&#39;s design and usage patterns. This opens the system up to
attacks of opportunity and support the planning of attacks on the
service, system, or network.


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

### CCC.Core.TH13

**Resource Tags are Manipulated**

**Description:** When resource tags are altered, it can lead to misclassification or
mismanagement of resources. This can reduce the efficacy of organizational
policies, billing rules, or network access rules. Such changes could cause
compromised confidentiality, integrity, or availability of the system and
its data.


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

The following controls have been designed to mitigate the aforementioned threats that have been identified for CCC.VM. Each control includes one or more Assessment Requirements that should always pass for a service to be considered compliant with this control catalog. If your experience can help improve these controls, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the controls, which is then followed by an elucidation of each control and relevant mappings.

|Control ID|Control Title|
|----|----|
|CCC.Core.C02|Encrypt Data for Storage|
|CCC.Core.C06|Restrict Deployments to Trust Perimeter|
|CCC.Core.C08|Replicate Data to Multiple Locations|
|CCC.Core.C09|Ensure Integrity of Access Logs|
|CCC.Core.C11|Protect Encryption Keys|
|CCC.Core.C03|Implement Multi-factor Authentication (MFA) for Access|
|CCC.Core.C05|Prevent Access from Untrusted Entities|
|CCC.Core.C04|Log All Access and Changes|

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
