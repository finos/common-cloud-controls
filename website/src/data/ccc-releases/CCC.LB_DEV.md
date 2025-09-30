
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

# CCC.LB vDEV (CCC Load Balancer Capabilities)

This documents the minimual set of capabilities that should be present
for a load balancer service to be considered for use in financial
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

The following capabilities are required to be present on a resource for it to be considered a CCC Load Balancer Capabilities service. Threats outlined later in this catalog are assesssed based on the presence of these capabilities.

- **CCC.LB.F01: Static Load Balancing**
  
  Employ load balancing algorithms that follow fixed rules, independent of the current server state.

- **CCC.LB.F02: Dynamic Load Balancing**
  
  Employ load balancing algorithms that consider the current state of servers before distributing traffic. Load balancer adjusts traffic distribution in real-time based on the current server health, resource utilization, and traffic conditions.

- **CCC.LB.F03: Layer 7 Routing**
  
  Providing distribution of incoming traffic based on the application layer or layer 7 (on ISO model) information. Some of the supported protocols on layer 7 are HTTP, HTTPS, HTTP/2, gRPC, and WebSockets.

- **CCC.LB.F04: Layer 4 Routing**
  
  Providing distribution of incoming traffic based on the transport layer or layer 4 (on ISO model) information. It uses the combination of IP addresses and TCP/UDP port to distribute incoming traffic rather than inspecting the actual content of the packets.

- **CCC.LB.F05: URL-Based Routing**
  
  Direct incoming requests to different backend resources based on the content of the request URL.

- **CCC.LB.F06: HTTP Header-Based Routing**
  
  Direct incoming requests to different backend resources based on the values of HTTP headers.

- **CCC.LB.F07: WebSocket Support**
  
  Ability to support web socket communication.

- **CCC.LB.F08: Dual-stack Load Balancing**
  
  Ability to support traffic originated from both IPv4 and IPv6.

- **CCC.LB.F09: Load Balancer Autoscaling**
  
  Ability for the load balancer to dynamically adjust its capacity in response to fluctuations in incoming traffic.

- **CCC.LB.F10: Target Autoscaling**
  
  Ability for the load balancer to trigger scaling actions of the backend instances (targets) to handle fluctuations in incoming traffic.

- **CCC.LB.F11: SSL/TLS Termination**
  
  Process of decrypting SSL or TLS encrypted traffic at the load balancer level rather than at the backend servers. This allows the load balancer to offload the decryption task from the backend servers.

- **CCC.LB.F12: Target Health Checks**
  
  Ability to continuously perform health checks on backend backend targets in form of checking the response to HTTP request, TCP connection or checking other application-specific parameter

- **CCC.LB.F13: Health Checks-based Target Removal**
  
  If the health check detects that a backend target is unhealthy the load balancer will remove that unhealthy target from its list of available backend instances. This ensures that traffic is no longer routed to the unhealthy target.

- **CCC.LB.F14: Retries**
  
  Ability to retry delivery of failed requests to targets. The conditions under which the load balancer retries, how long to wait before retrying, and the maximum number of retries permitted are configurable.

- **CCC.LB.F15: Session Affinity**
  
  Can configure subsequent requests from an initial client to be passed to the same target.

- **CCC.LB.F16: URL Redirects**
  
  Redirect incoming traffic to a different URL or location.

- **CCC.LB.F17: URL Rewrites**
  
  Rewrite URL paths before forwarding them to backend services.

- **CCC.LB.F18: Custom Response**
  
  Ability to configure specific HTTP responses to be returned by the load balancer under defined conditions.

- **CCC.LB.F19: Request and Response Header Transformations**
  
  Ability to modify HTTP headers of both incoming requests and outgoing responses.

- **CCC.LB.F20: Traffic Splitting / Weighted Routing**
  
  Can distribute incoming traffic across multiple backend resources based on predefined weights or percentages (e.g., for canary deployments, A/B testing, blue-green deployments, or gradual traffic migrations).

- **CCC.LB.F21: Traffic Mirroring**
  
  Can duplicate incoming network traffic and send it to a secondary destination for monitoring, analysis, or testing purposes.

- **CCC.LB.F22: Rate Limiting / Throttling**
  
  Ability to limit the number of requests per second per client. This ensures that no single client or user overloads the backend servers, distributing requests fairly across multiple instances.

- **CCC.LB.F23: Firewall Integration**
  
  Ability to seamlessly integrate with firewall services to ensure only legitimate and secure traffic reaches backend servers, blocking malicious requests.

- **CCC.Core.F03: Access Log Publication**
  
  The service automatically publishes structured, verbose records of activities performed within the scope of the service by external actors.

- **CCC.Core.F04: Transaction Rate Limits**
  
  The service always provides industry-standard network throughput up to a user-specified rate limit, beyond which excess requests may be throttled, delayed, or rejected.

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

- **CCC.Core.F19: Resource Scaling**
  
  The service may be configured to scale child resources automatically or on-demand.

- **CCC.Core.F20: Resource Tagging**
  
  The service provides users with the ability to tag a child resource with metadata that can be reviewed or queried.

- **CCC.Core.F22: Location Lock-In**
  
  The service may be configured to restrict the deployment of child resources to specific geographic locations.


<div style="page-break-after: always;"></div>

## Threats

The following threats have been identified based upon CCC Load Balancer Capabilities service capabilities. Controls outlined later in this catalog are designed to mitigate these threats. If you are aware of threats to CCC Load Balancer Capabilities services that are not captured here, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the identified threats, which is then followed by an elucidation of each threat and relevant mappings.

|Threat ID|Threat Title|
|----|----|
|CCC.LB.TH01|Unrestricted Request Traffic Overwhelms Downstream Services|
|CCC.LB.TH03|Traffic Distribution Is Manipulated|
|CCC.LB.TH04|Session Persistence Is Exploited|
|CCC.LB.TH05|Health Checks Are Exploited to Take Services Offline|
|CCC.LB.TH06|Sensitive Metadata Exposure via HTTP Headers|
|CCC.LB.TH07|TLS Certificates Are Expired or Invalid|
|CCC.Core.TH01|Access Control is Misconfigured|
|CCC.Core.TH02|Data is Intercepted in Transit|
|CCC.Core.TH07|Logs are Tampered With or Deleted|
|CCC.Core.TH09|Runtime Logs are Read by Unauthorized Entities|
|CCC.Core.TH12|Resource Constraints are Exhausted|
|CCC.Core.TH15|Automated Enumeration and Reconnaissance by Non-human Entities|
|CCC.Core.TH16|Publications are Disabled|

---

### CCC.LB.TH01

**Unrestricted Request Traffic Overwhelms Downstream Services**

**Description:** Absence of filtering or rate limiting permits malicious traffic to
overload downstream services and facilitates brute-force activity.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.Core.F04</li>
      
  <li>CCC.LB.F22</li>
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
          <td>T1110</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.LB.TH03

**Traffic Distribution Is Manipulated**

**Description:** Adjusting distribution policies can concentrate traffic on specific nodes
causing DoS or redirect flows through unwanted paths.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.LB.F02</li>
  <li>CCC.LB.F20</li>
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
          <td>T1557</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.LB.TH04

**Session Persistence Is Exploited**

**Description:** Improper session-affinity settings can enable session fixation or
hijacking across backend targets.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.LB.F15</li>
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
          <td>T1557</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.LB.TH05

**Health Checks Are Exploited to Take Services Offline**

**Description:** Manipulating health-check endpoints or responses can cause healthy
targets to be marked unavailable, leading to denial of service.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.LB.F12</li>
  <li>CCC.LB.F13</li>
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
          <td>T1583</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.LB.TH06

**Sensitive Metadata Exposure via HTTP Headers**

**Description:** Response headers may reveal software versions, internal IPs, or other
metadata useful for reconnaissance.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.LB.F19</li>
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
          <td>T1592</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
        <tr>
          <td>T1530</td>
          <td>MITRE-ATT&amp;CK</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.LB.TH07

**TLS Certificates Are Expired or Invalid**

**Description:** Stale or untrusted certificates weaken encrypted-traffic protection.


<div class="flex-container">
  <div class="flex-item-left">
  Applies to these capabilities:
  <ul>
    
      
  <li>CCC.LB.F11</li>
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
          <td>T1608</td>
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

The following controls have been designed to mitigate the aforementioned threats that have been identified for CCC.LB. Each control includes one or more Assessment Requirements that should always pass for a service to be considered compliant with this control catalog. If your experience can help improve these controls, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the controls, which is then followed by an elucidation of each control and relevant mappings.

|Control ID|Control Title|
|----|----|
|CCC.LB.C01|Enforce and Detect Rate Limiting|
|CCC.LB.C06|Secure Health-Check Telemetry|
|CCC.Core.C04|Log All Access and Changes|
|CCC.LB.C04|Enforce Distribution Policies|
|CCC.LB.C05|Validate Session Affinity|
|CCC.LB.C09|Restrict Management API Access|
|CCC.Core.C03|Implement Multi-factor Authentication (MFA) for Access|
|CCC.Core.C05|Prevent Access from Untrusted Entities|
|CCC.LB.C02|Auto-Scale Load Balancer Capacity|
|CCC.LB.C07|Scrub Sensitive Headers|
|CCC.Core.C01|Encrypt Data for Transmission|
|CCC.Core.C02|Encrypt Data for Storage|
|CCC.Core.C06|Restrict Deployments to Trust Perimeter|
|CCC.Core.C10|Restrict Data Replication to Trust Perimeter|
|CCC.LB.C08|Automate Certificate Renewal|

### CCC.LB.C01

**Enforce and Detect Rate Limiting**

**Objective:** Detect and throttle malicious or excessive requests to prevent downstream resource exhaustion and brute-force activity.


| Assessment Requirement | Applicability |
| --- | --- |
| When a single client sends more than 2000 requests within any 5-minute sliding window, the load balancer MUST throttle all subsequent requests from that client for at least 60 seconds. |tlp-green<br />tlp-amber<br />tlp-red<br /> |
| When throttling is invoked, the load balancer MUST record the event in the access log within 5 minutes for alerting and trend analysis. |tlp-green<br />tlp-amber<br />tlp-red<br /> |

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
          <td>LB</td>
          <td>CCC.LB.TH01</td>
        </tr>
        <tr>
          <td>LB</td>
          <td>CCC.LB.TH09</td>
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
          <td>NIST-CSF</td>
          <td>PR.AC-7</td>
        </tr>
        <tr>
          <td>NIST-CSF</td>
          <td>PR.PT-4</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AU-6</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-5</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AC-7</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.LB.C06

**Secure Health-Check Telemetry**

**Objective:** Monitor health-check endpoints for tampering and alert on
abnormal status changes.


| Assessment Requirement | Applicability |
| --- | --- |
| When more than 10 percent of targets change from healthy to unhealthy within five minutes, an alert MUST be issued. |tlp-green<br />tlp-amber<br />tlp-red<br /> |

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
          <td>LB</td>
          <td>CCC.LB.TH05</td>
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
          <td>DE.AE-2</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SI-4</td>
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

### CCC.LB.C04

**Enforce Distribution Policies**

**Objective:** Ensure traffic-splitting weights and algorithms are modified
only by trusted identities.


| Assessment Requirement | Applicability |
| --- | --- |
| When routing weights change, the request MUST originate from an explicitly defined and trusted identity and MUST be logged. |tlp-green<br />tlp-amber<br />tlp-red<br /> |

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
          <td>LB</td>
          <td>CCC.LB.TH03</td>
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
          <td>PR.AC-1</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>AC-3</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.LB.C05

**Validate Session Affinity**

**Objective:** Configure session persistence to minimise fixation and hijacking
risks.


| Assessment Requirement | Applicability |
| --- | --- |
| When stickiness is enabled, session cookies MUST expire within 30 minutes of inactivity. |tlp-green<br />tlp-amber<br />tlp-red<br /> |

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
          <td>LB</td>
          <td>CCC.LB.TH04</td>
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
          <td>NIST_800_53</td>
          <td>SC-23</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.LB.C09

**Restrict Management API Access**

**Objective:** Limit load-balancer API calls to authorised identities and
trusted networks.


| Assessment Requirement | Applicability |
| --- | --- |
| When an API call originates outside the approved CIDR set, the request MUST be denied. |tlp-green<br />tlp-amber<br />tlp-red<br /> |

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
          <td>LB</td>
          <td>CCC.LB.TH08</td>
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

### CCC.LB.C02

**Auto-Scale Load Balancer Capacity**

**Objective:** Expand load-balancer capacity to maintain availability during traffic
spikes.


| Assessment Requirement | Applicability |
| --- | --- |
| When concurrent connections reach 80 percent of capacity, the autoscaling group MUST add at least one instance within five minutes. |tlp-green<br />tlp-amber<br />tlp-red<br /> |

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
          <td>LB</td>
          <td>CCC.LB.TH09</td>
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
          <td>ID.BE-5</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>CP-10</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

### CCC.LB.C07

**Scrub Sensitive Headers**

**Objective:** Remove headers that disclose internal details or software
versions from HTTP responses.


| Assessment Requirement | Applicability |
| --- | --- |
| When responses pass through the load balancer, the &#34;Server&#34; header MUST be replaced with &#34;lb&#34;. |tlp-green<br />tlp-amber<br />tlp-red<br /> |

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
          <td>LB</td>
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
          <td>PR.DS-2</td>
        </tr>
        <tr>
          <td>NIST_800_53</td>
          <td>SC-13</td>
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

### CCC.LB.C08

**Automate Certificate Renewal**

**Objective:** Maintain valid TLS certificates by automating renewal and
deployment before expiry.


| Assessment Requirement | Applicability |
| --- | --- |
| When a certificate is within 30 days of expiry, automated renewal MUST complete and deploy a new certificate within 24 hours. |tlp-green<br />tlp-amber<br />tlp-red<br /> |

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
          <td>LB</td>
          <td>CCC.LB.TH07</td>
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
          <td>SC-17</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
