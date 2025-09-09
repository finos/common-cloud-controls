
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

# CCC.ObjStor v2025.09 (Object Storage)

Object storage is a data storage architecture that manages data as objects,
rather than as files or blocks. Each object contains the data itself,
metadata, and a unique identifier, making it ideal for storing large amounts
of unstructured data such as multimedia files, backups, and archives. It is
highly scalable and often used in cloud environments due to its flexibility
and accessibility.


<div style="page-break-after: always;"></div>

## Release Details

> TODO
>
> _- Eddie Knight, Sonatype ([eddie-knight](https://github.com/eddie-knight))_

### Contributors to this Release

| Name | Company | GitHub ID |
| ---- | ------- | ------ |
| Damien Burks | Citi | [damienjburks](https://github.com/damienjburks) |
| Eddie Knight | Sonatype | [eddie-knight](https://github.com/eddie-knight) |
| Steven Shiells | Scott Logic | [sshiells-scottlogic](https://github.com/sshiells-scottlogic) |
| Michael Lysaght | Citi | [mlysaght2017](https://github.com/mlysaght2017) |
| Sonali Mendis | Scott Logic | [smendis-scottlogic](https://github.com/smendis-scottlogic) |
| Dave Ogle | Scott Logic | [dogle-scottlogic](https://github.com/dogle-scottlogic) |
| Naseer Mohammad | Google | [nas-hub](https://github.com/nas-hub) |

<div style="page-break-after: always;"></div>

## Capabilities

The following capabilities are required to be present on a resource for it to be considered a Object Storage service. Threats outlined later in this catalog are assesssed based on the presence of these capabilities.

- **CCC.ObjStor.F01: Storage Buckets**
  
  Provides uniquely identifiable segmentations in which data elements may be stored.

- **CCC.ObjStor.F02: Storage Objects**
  
  Supports storing, accessing, and managing data elements which contain both data and metadata.

- **CCC.ObjStor.F03: Bucket Capacity Limit**
  
  Provides the ability to set a maximum total capacity for objects within a bucket.

- **CCC.ObjStor.F04: Object Size Limit**
  
  Supports setting a maximum object size for storing objects.

- **CCC.ObjStor.F05: Store New Objects**
  
  Supports for storing a new object in the bucket.

- **CCC.ObjStor.F06: Replace Stored Objects**
  
  Supports for replacing an object in the bucket with a new object for the same key.

- **CCC.ObjStor.F07: Delete Stored Objects**
  
  Supports for deleting objects from the bucket given the object key.

- **CCC.ObjStor.F08: Lifecycle Policies**
  
  Supports defining policies to automate data management tasks.

- **CCC.ObjStor.F09: Object Modification Locks**
  
  Allows locking of objects to disable modification and/or deletion of an object for a defined period of time.

- **CCC.ObjStor.F10: Object Level Access Control**
  
  Supports controlling access to specific objects within the object store.

- **CCC.ObjStor.F11: Querying**
  
  Supports performing simple select queries to retrieve only a subset of objects from the bucket.

- **CCC.ObjStor.F12: Storage Classes**
  
  Provides different storage classes for frequently and infrequently accessed objects.


<div style="page-break-after: always;"></div>

## Threats

The following threats have been identified based upon Object Storage service capabilities. Controls outlined later in this catalog are designed to mitigate these threats. If you are aware of threats to Object Storage services that are not captured here, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the identified threats, which is then followed by an elucidation of each threat and relevant mappings.

|Threat ID|Threat Title|
|----|----|
|CCC.ObjStor.TH01|Data Exfiltration via Insecure Lifecycle Policies|
|CCC.ObjStor.TH02|Improper Enforcement of Object Modification Locks|

---

### CCC.ObjStor.TH01

**Data Exfiltration via Insecure Lifecycle Policies**

**Description:** Misconfigured lifecycle policies may unintentionally allow data to be
exfiltrated or destroyed prematurely, resulting in a loss of availability
and potential exposure of sensitive data.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.ObjStor.F08</li>
  <li>CCC.Core.F11</li>
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
          <td>T1020</td>
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
      </tbody>
    </table>
  </div>
</div>

### CCC.ObjStor.TH02

**Improper Enforcement of Object Modification Locks**

**Description:** Attackers may exploit vulnerabilities in object modification locks to
delete or alter objects despite the lock being in place, leading to data
loss or tampering.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.ObjStor.F09</li>
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
          <td>T1490</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1491</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1565</td>
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
|CCC.ObjStor.C01|Prevent Requests to Buckets or Objects with Untrusted KMS Keys|
|CCC.ObjStor.C03|Prevent Bucket Deletion Through Irrevocable Bucket Retention Policy|
|CCC.ObjStor.C04|Objects have an Effective Retention Policy by Default|
|CCC.ObjStor.C05|Versioning is Enabled for All Objects in the Bucket|
|CCC.ObjStor.C06|Access Logs are Stored in a Separate Data Store|
|CCC.ObjStor.C02|Enforce Uniform Bucket-level Access to Prevent Inconsistent Permissions|

### CCC.ObjStor.C01

**Prevent Requests to Buckets or Objects with Untrusted KMS Keys**

**Objective:** Prevent any requests to object storage buckets or objects using
untrusted KMS keys to protect against unauthorized data encryption
that can impact data availability and integrity.


| Assessment Requirement | Applicability |
| --- | --- |
| When a request is made to read a protected bucket, the service MUST prevent any request using KMS keys not listed as trusted by the organization. |tlp-amber<br />tlp-red<br /> |
| When a request is made to read a protected object, the service MUST prevent any request using KMS keys not listed as trusted by the organization. |tlp-amber<br />tlp-red<br /> |
| When a request is made to write to a bucket, the service MUST prevent any request using KMS keys not listed as trusted by the organization. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When a request is made to write to an object, the service MUST prevent any request using KMS keys not listed as trusted by the organization. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |

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
          <td>PR.DS-1</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>DCS-04</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>DCS-06</td>
        </tr>
        <tr>
          <td>ISO_27001</td>
          <td>2013 A.10.1.1</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-28</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.ObjStor.C03

**Prevent Bucket Deletion Through Irrevocable Bucket Retention Policy**

**Objective:** Ensure that object storage bucket is not deleted after creation,
and that the preventative measure cannot be unset.


| Assessment Requirement | Applicability |
| --- | --- |
| When an object storage bucket deletion is attempted, the bucket MUST be fully recoverable for a set time-frame after deletion is requested. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When an attempt is made to modify the retention policy for an object storage bucket, the service MUST prevent the policy from being modified. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |

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
          <td>PR.DS-1</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>DSP-16</td>
        </tr>
        <tr>
          <td>ISO_27001</td>
          <td>2022 A.8.1.4</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-28</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>CP-10</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.ObjStor.C04

**Objects have an Effective Retention Policy by Default**

**Objective:** Ensure that all objects stored in the object storage system have a
retention policy applied by default, preventing premature deletion
or modification of objects and ensuring compliance with data retention
regulations.


| Assessment Requirement | Applicability |
| --- | --- |
| When an object is uploaded to the object storage system, the object MUST automatically receive a default retention policy that prevents premature deletion or modification. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When an attempt is made to delete or modify an object that is subject to an active retention policy, the service MUST prevent the action from being completed. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |

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
          <td>PR.DS-1</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>DSP-16</td>
        </tr>
        <tr>
          <td>ISO_27001</td>
          <td>2022 A.8.1.4</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-28</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>CP-10</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.ObjStor.C05

**Versioning is Enabled for All Objects in the Bucket**

**Objective:** Ensure that versioning is enabled for all objects stored in the object
storage bucket to enable recovery of previous versions of objects in
case of loss or corruption.


| Assessment Requirement | Applicability |
| --- | --- |
| When an object is uploaded to the object storage bucket, the object MUST be stored with a unique identifier. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When an object is modified, the service MUST assign a new unique identifier to the modified object to differentiate it from the previous version. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When an object is modified, the service MUST allow for recovery of previous versions of the object. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When an object is deleted, the service MUST retain other versions of the object to allow for recovery of previous versions. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |

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
          <td>PR.DS-1</td>
        </tr>
        <tr>
          <td>ISO_27001</td>
          <td>2022 A.8.1.4</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-28</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>CP-10</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>DSP-16</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.ObjStor.C06

**Access Logs are Stored in a Separate Data Store**

**Objective:** Ensure that access logs for object storage buckets are stored in a
separate data store to protect against unauthorized access, tampering,
or deletion of logs (Logbuckets are exempt from this requirement,
but must be tlp-red).


| Assessment Requirement | Applicability |
| --- | --- |
| When an object storage bucket is accessed, the service MUST store access logs in a separate data store. |tlp-amber<br />tlp-red<br /> |

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
          <td>CCM</td>
          <td>DSP-07</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>DSP-17</td>
        </tr>
        <tr>
          <td>ISO_27001</td>
          <td>2022 A.8.15.0</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-9</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-28</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.ObjStor.C02

**Enforce Uniform Bucket-level Access to Prevent Inconsistent Permissions**

**Objective:** Ensure that uniform bucket-level access is enforced across all
object storage buckets. This prevents the use of ad-hoc or
inconsistent object-level permissions, ensuring centralized,
consistent, and secure access management in accordance with the
principle of least privilege.


| Assessment Requirement | Applicability |
| --- | --- |
| When a permission set is allowed for an object in a bucket, the service MUST allow the same permission set to access all objects in the same bucket. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When a permission set is denied for an object in a bucket, the service MUST deny the same permission set to access all objects in the same bucket. |tlp-clear<br />tlp-green<br />tlp-amber<br />tlp-red<br /> |

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
          <td>ISO_27001</td>
          <td>2013 A.9.4.1</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AC-3</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AC-6</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>DCS-09</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
