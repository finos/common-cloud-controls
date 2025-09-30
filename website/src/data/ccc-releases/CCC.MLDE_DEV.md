
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

# CCC.MLDE vDEV (Machine Learning Development Environment)

Machine Learning Development Environment refers to the suite of tools,
infrastructure, and processes that facilitate the development, testing,
deployment, and maintenance of machine learning models.


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

The following capabilities are required to be present on a resource for it to be considered a Machine Learning Development Environment service. Threats outlined later in this catalog are assesssed based on the presence of these capabilities.

- **CCC.MLDE.F01: Managed Notebook Environments**
  
  Provides fully managed notebook instances specifically designed for machine learning development, eliminating the need to manage underlying infrastructure.

- **CCC.MLDE.F02: Pre-configured Machine Learning Libraries**
  
  Offers environments pre-installed with popular machine learning libraries and frameworks such as TensorFlow, PyTorch, and Scikit-learn, optimized for ML tasks.

- **CCC.MLDE.F03: Integrated Experiment Management**
  
  Facilitates tracking and management of machine learning experiments, including parameters, metrics, and artifacts, within the development environment.

- **CCC.MLDE.F04: Model Training and Deployment Integration**
  
  Supports seamless transition from model development to training and deployment, allowing models to be trained and deployed directly from the MLDE.

- **CCC.MLDE.F05: Automated Machine Learning (AutoML) Capabilities**
  
  Offers AutoML functionalities to automatically build, train, and optimize machine learning models with minimal manual intervention.

- **CCC.MLDE.F06: GPU/Specialized Hardware Support**
  
  Provides access to GPU instances and specialized ML acceleration hardware (TPUs, FPGAs) with automated driver and runtime management.

- **CCC.MLDE.F07: Data Pipeline Integration**
  
  Supports integration with data preparation and feature engineering pipelines, including versioning of datasets and capabilities used in ML experiments.

- **CCC.MLDE.F08: Model Registry**
  
  Provides centralized storage and versioning for trained models, including metadata about training runs, model artifacts, and deployment history.

- **CCC.MLDE.F09: Collaborative Development Support**
  
  Enables multiple data scientists to work on the same project with version control integration, shared notebooks, and resource management.

- **CCC.MLDE.F10: Model Monitoring and Drift Detection**
  
  Supports monitoring of deployed models for performance degradation, data drift, and concept drift with automated alerting capabilities.

- **CCC.MLDE.F11: Reproducibility Capabilities**
  
  Provides capability to capture and version all components needed to reproduce an ML experiment, including code, data, and environment configurations.

- **CCC.MLDE.F12: Resource Scheduling and Optimization**
  
  Supports scheduling and optimization of compute resources for training jobs, including spot instance usage and auto-scaling capabilities.

- **CCC.MLDE.F13: Security and Compliance Controls**
  
  Provides specific controls for ML workflows including model governance, bias detection, and compliance documentation for regulated industries.

- **CCC.Core.F03: Access Log Publication**
  
  The service automatically publishes structured, verbose records of activities performed within the scope of the service by external actors.

- **CCC.Core.F06: Access Control**
  
  The service automatically enforces user configurations to restrict or allow access to a specific component or a child resource based on factors such as user identities, roles, groups, or attributes.

- **CCC.Core.F08: Data Replication**
  
  The service automatically will or can be configured to replicate data across multiple deployments simultaneously with parity.

- **CCC.Core.F09: Metrics Publication**
  
  The service automatically publishes structured, numeric, time-series data points related to the performance, availability, and health of the service or its child resources.

- **CCC.Core.F10: Log Publication**
  
  The service automatically publishes structured, verbose records of activities, operations, or events that occur within the service.

- **CCC.Core.F14: API Access**
  
  The service exposes a port enabling external actors to interact programmatically with the service and its resources using HTTP protocol methods such as GET, POST, PUT, and DELETE.

- **CCC.Core.F15: Cost Management**
  
  The service monitors data published by child or networked resources to infer usage patterns and generate cost reports for the service.

- **CCC.Core.F16: Budgeting**
  
  The service may be configured to take a user-specified action when a spending threshold is met or exceeded on a child or networked resource.

- **CCC.Core.F17: Alerting**
  
  The service may be configured to emit a notification based on a user-defined condition related to the data published by a child or networked resource.

- **CCC.Core.F20: Resource Tagging**
  
  The service provides users with the ability to tag a child resource with metadata that can be reviewed or queried.

- **CCC.Core.F23: Network Access Rules**
  
  The service restricts access to child or networked resources based on user-defined network parameters such as IP address, protocol, port, or source.


<div style="page-break-after: always;"></div>

## Threats

The following threats have been identified based upon Machine Learning Development Environment service capabilities. Controls outlined later in this catalog are designed to mitigate these threats. If you are aware of threats to Machine Learning Development Environment services that are not captured here, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the identified threats, which is then followed by an elucidation of each threat and relevant mappings.

|Threat ID|Threat Title|
|----|----|

---


<div style="page-break-after: always;"></div>

## Controls

The following controls have been designed to mitigate the aforementioned threats that have been identified for CCC.MLDE. Each control includes one or more Assessment Requirements that should always pass for a service to be considered compliant with this control catalog. If your experience can help improve these controls, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the controls, which is then followed by an elucidation of each control and relevant mappings.

|Control ID|Control Title|
|----|----|
|CCC.MLDE.C01|Define Access Mode for ML Development Environments|
|CCC.MLDE.C03|Disable Root Access on MLDE Instances|
|CCC.MLDE.C04|Disable Terminal Access on MLDE Instances|
|CCC.Core.C03|Implement Multi-factor Authentication (MFA) for Access|
|CCC.Core.C05|Prevent Access from Untrusted Entities|
|CCC.MLDE.C02|Disable File Downloads on MLDE Instances|
|CCC.MLDE.C05|Restrict Environment Options on MLDE Instances|
|CCC.MLDE.C06|Require Automatic Scheduled Upgrades on User-Managed MLDE Instances|
|CCC.MLDE.C07|Restrict Public IP Access on MLDE Instances|
|CCC.MLDE.C08|Restrict Virtual Networks for MLDE Instances|
|CCC.Core.C01|Encrypt Data for Transmission|
|CCC.Core.C02|Encrypt Data for Storage|
|CCC.Core.C06|Restrict Deployments to Trust Perimeter|
|CCC.Core.C04|Log All Access and Changes|

### CCC.MLDE.C01

**Define Access Mode for ML Development Environments**

**Objective:** Ensure that access to Machine Learning Development Environment (MLDE)
resources is strictly defined and controlled.
Only authorized users with appropriate permissions can access these environments,
mitigating the risk of unauthorized access, data leakage, or service disruption.


| Assessment Requirement | Applicability |
| --- | --- |
| Verify that only authorized users can access MLDE resources, and that access modes are properly defined and enforced. |tlp-red<br />tlp-amber<br />tlp-green<br />tlp-clear<br /> |

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
          <td>CCC.MLDE.TH01</td>
        </tr>
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
          <td>ISO_27001</td>
          <td>2013 A.9.1.1</td>
        </tr>
        <tr>
          <td>ISO_27001</td>
          <td>2013 A.9.2.1</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AC-2</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AC-3</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>IAM-01</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>IAM-02</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.MLDE.C03

**Disable Root Access on MLDE Instances**

**Objective:** Prevent users from obtaining root access on MLDE instances to reduce the
risk of unauthorized system modifications and potential security breaches.


| Assessment Requirement | Applicability |
| --- | --- |
| Verify that root access is disabled on MLDE instances containing sensitive data. |tlp-red<br /> |
| For MLDE instances without sensitive data, ensure that root access is only enabled when necessary and properly authorized. |tlp-red<br />tlp-amber<br />tlp-green<br />tlp-clear<br /> |

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
          <td>CCC.MLDE.TH01</td>
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
          <td>AC-6</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>IAM-08</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>IAM-12</td>
        </tr>
        <tr>
          <td>ISO_27001</td>
          <td>2013 A.9.2.3</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.MLDE.C04

**Disable Terminal Access on MLDE Instances**

**Objective:** Prevent users from accessing the terminal on MLDE instances to limit the risk of
unauthorized commands and potential system compromise.


| Assessment Requirement | Applicability |
| --- | --- |
| Verify that terminal access is disabled on MLDE instances containing sensitive data. |tlp-red<br /> |
| For MLDE instances without sensitive data, ensure that terminal access is only enabled when necessary and properly authorized. |tlp-red<br />tlp-amber<br />tlp-green<br />tlp-clear<br /> |

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
          <td>CCC.MLDE.TH01</td>
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
          <td>AC-6</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>IAM-08</td>
        </tr>
        <tr>
          <td>ISO_27001</td>
          <td>2013 A.9.2.3</td>
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

### CCC.MLDE.C02

**Disable File Downloads on MLDE Instances**

**Objective:** Prevent unauthorized file downloads from MLDE instances to protect sensitive data from being exfiltrated.


| Assessment Requirement | Applicability |
| --- | --- |
| Confirm that file download functionality is disabled on MLDE instances containing sensitive data. |tlp-red<br /> |
| For MLDE instances without sensitive data, ensure that file downloads are monitored and logged. |tlp-red<br />tlp-amber<br />tlp-green<br />tlp-clear<br /> |

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
          <td>CCC.MLDE.TH02</td>
        </tr>
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
          <td>PR.DS-5</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>DSI-05</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>DSI-07</td>
        </tr>
        <tr>
          <td>ISO_27001</td>
          <td>2013 A.13.2.1</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-7</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-8</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.MLDE.C05

**Restrict Environment Options on MLDE Instances**

**Objective:** Limit the virtual machine and container image options available when creating
new MLDE instances to approved and secure configurations.


| Assessment Requirement | Applicability |
| --- | --- |
| Verify that only approved VM and container images can be selected when creating MLDE instances. |tlp-red<br />tlp-amber<br /> |
| Attempt to create an MLDE instance with an unapproved image and confirm that it is denied. |tlp-red<br /> |

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
          <td>CCC.MLDE.TH04</td>
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
          <td>PR.IP-1</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>TVM-02</td>
        </tr>
        <tr>
          <td>ISO_27001</td>
          <td>2013 A.12.5.1</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>CM-2</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.MLDE.C06

**Require Automatic Scheduled Upgrades on User-Managed MLDE Instances**

**Objective:** Ensure that MLDE instances are kept up-to-date with the
latest security patches by enforcing automatic scheduled upgrades.


| Assessment Requirement | Applicability |
| --- | --- |
| Verify that automatic scheduled upgrades are enabled on user-managed MLDE instances containing sensitive data. |tlp-red<br /> |
| Ensure that the upgrade schedule is appropriately configured and does not interfere with critical operations. |tlp-red<br />tlp-amber<br />tlp-green<br />tlp-clear<br /> |

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
          <td>CCC.MLDE.TH04</td>
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
          <td>PR.IP-12</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>TVM-01</td>
        </tr>
        <tr>
          <td>CCM</td>
          <td>TVM-02</td>
        </tr>
        <tr>
          <td>ISO_27001</td>
          <td>2013 A.12.6.1</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SI-2</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.MLDE.C07

**Restrict Public IP Access on MLDE Instances**

**Objective:** Prevent public IP access to MLDE instances to reduce exposure to the internet and enhance security.


| Assessment Requirement | Applicability |
| --- | --- |
| Verify that MLDE instances containing sensitive data cannot be accessed via public IP addresses. |tlp-red<br /> |
| For MLDE instances without sensitive data requiring public access, ensure that appropriate security controls are in place and access is approved. |tlp-red<br />tlp-amber<br />tlp-green<br />tlp-clear<br /> |

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
          <td>CCC.MLDE.TH02</td>
        </tr>
        <tr>
          <td>CCC</td>
          <td>CCC.VPC.TH02</td>
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
          <td>SEF-05</td>
        </tr>
        <tr>
          <td>ISO_27001</td>
          <td>2013 A.13.1.1</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-7</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.MLDE.C08

**Restrict Virtual Networks for MLDE Instances**

**Objective:** Limit the virtual networks that can be used when creating new MLDE instances to
ensure they are deployed within approved and secure network environments.


| Assessment Requirement | Applicability |
| --- | --- |
| Verify that MLDE instances containing sensitive data can only be deployed in approved virtual networks with appropriate security controls. |tlp-red<br /> |
| Ensure that MLDE instances without sensitive data are deployed in networks that meet organizational security standards. |tlp-red<br />tlp-amber<br />tlp-green<br />tlp-clear<br /> |

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
          <td>CCC.MLDE.TH01</td>
        </tr>
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
          <td>CCM</td>
          <td>IAM-12</td>
        </tr>
        <tr>
          <td>ISO_27001</td>
          <td>2013 A.9.1.2</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AC-6</td>
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
