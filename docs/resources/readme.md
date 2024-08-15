# Resource Overview and Approach

## Approach

In developing CCC, we desire to reuse existing resources from other projects, such as frameworks, toolkits, documentation, or workflows. This can save time and effort, avoid duplication of work, and ensure consistency and quality across the project. However, reusing resources also requires some planning and coordination, as well as finding those best practices. In this section, we will provide guidance on resources we recommend and our reasoning behind them.

Our approach is to break down the core deliverables being investigated by CCC into functional areas, then identify any potentially reusable content in each area. Once we’ve identified potential content, we will evaluate it for suitability by looking at its relevance, quality, and overall compatibility. It is likely that in some areas, no suitable content exists, where we will recommend that CCC invest directly.

As we decompose the CCC project into these functional areas where duplication may exist, we think about it as a series of steps:

1. **Service Taxonomy** – Provides a common set of cloud agnostic service definitions and attributes which we can refer to when discussing controls. These are mapped to the specific cloud provider services. For example, Virtual Machines is our common name for Amazon Elastic Cloud Compute, Azure Virtual Machines, and Google Compute Engine.
2. **Threats** – We evaluate a set of threats against the common service taxonomy, to understand the risks to be mitigated by the required controls. For example, an attacker may intercept traffic to a VM.
3. **Controls** – Once the threats are known, we map a set of controls to mitigate each of the threats. For example, all traffic to a VM must be encrypted.
4. **Evidence** – Finally, to consider a given cloud provider service to be compliant, a required set of evidence must be programmatically verified. For example, a policy X enforces network encryption on VMs.

## Overview

We summarize our recommendations against each of these areas:

### Service Taxonomy

One of the key goals of CCC, is to ensure that the controls are provider agnostic and enable portability between cloud providers. It is apparent that in order to do this, we must be able to work against a common taxonomy of services.
On first glance, it seems that there must be a common library of these, and we have investigated portability standards such as ISO/IEC 19941:2017, or more service specific standards such as OVF from DMTF. However, to date we have been unable to find a clear, comprehensive, and open common mapping. Therefore, our current recommendation in this space is to invest directly in a taxonomy provided by CCC. Future efforts may be spent to further evaluate this space.

### Threats

Many threat libraries exist today, but few are as widely adopted in financial services as the MITRE ATT&CK Framework. We seek to align with existing open industry best practices, and therefore are recommending MITRE ATT&CK be used as our base threat library. Read more about this reasoning here.

### Controls

Many existing control catalogs exist today, and this is a space with a diverse adoption landscape. We desire to use a controls framework that has broad adoption, is global, and will provide a wealth of mappings to both threat libraries and cloud provider evidence.

NIST 800-53 is our top pick in this space and is our recommended control framework. We are also investigating the value of CDMC, a Cloud Data Management Controls framework developed by EDMCouncil in partnership with major CSPs.

### Evidence

When it comes to evidence, our focus is on the format and retrieval strategies to be used. We desire formats that are commonly adopted by practitioners, and generally available from service providers.
The OSCAL format is a leading industry standard that meets these needs and is our current recommendation.
