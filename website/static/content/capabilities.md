---
title: Capability Catalogs
description: Capabilities define the functional properties a cloud service must support — the scope of what CCC controls are written against.
path: /catalogs/capabilities
---

A capability catalog describes what a cloud service is and what it can do. Capabilities are the foundation of the CCC framework: before you can identify threats or specify controls, you need a clear, vendor-neutral definition of the service itself.

Each capability entry captures a discrete functional property of the service — for example, "supports server-side encryption at rest" or "supports access logging." These properties are expressed in a cloud-agnostic way so that they apply equally across AWS, Azure, Google Cloud, and other providers.

Capability catalogs serve as the authoritative scope boundary for a given service category. Threats and controls are always written against a defined capability, ensuring full traceability from risk to requirement.