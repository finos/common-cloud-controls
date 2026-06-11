---
title: Control Catalogs
description: Control catalogs specify the concrete security measures that mitigate identified threats for each cloud service.
path: /catalogs/controls
---

A control catalog defines what must be done to secure a cloud service. Each control entry specifies a concrete, testable requirement that directly addresses one or more threats identified in the corresponding threat catalog.

Controls are written to be implementable and auditable. They are expressed in a cloud-agnostic way so that financial services firms can reference a single standard regardless of which cloud provider they use, and so that cloud providers have a single, authoritative target to conform to.

Each control includes:

- A clear statement of the requirement
- The threat or threats it mitigates
- The capability it applies to
- Mappings to common compliance frameworks where applicable

Control catalogs are the primary artifact consumed by compliance teams and by downstream implementation projects such as [Compliant Financial Infrastructure (CFI)](https://github.com/finos/compliant-financial-infrastructure).

## Assessment Requirements and Applicability

Each control contains one or more **assessment requirements** — specific, testable conditions phrased as "When X, the service MUST Y." Every assessment requirement specifies its **applicability** using [TLP 2.0](https://www.first.org/tlp/) levels (`tlp-clear`, `tlp-green`, `tlp-amber`, `tlp-red`), which indicate the data sensitivity contexts in which the requirement applies.

For example, a requirement applicable at `tlp-green`, `tlp-amber`, and `tlp-red` applies to all environments except those with fully public data. A requirement applicable only at `tlp-red` is a hardening measure for the most restricted environments. This lets teams adopt a right-sized set of controls based on the sensitivity of each workload.