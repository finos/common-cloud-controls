# How major banks are investing in CCC to improve security and speed delivery

Banks do not run on one cloud if they can help it. Too much of the franchise on a single provider is **concentration risk** — an outage, a region, a contract, a question from the regulator. **Multi-cloud** is how they spread that risk. It also multiplies the control problem: the same security intent is implemented with Azure Policy on one cloud and AWS Config on another, and there is no **shared language** for what the control even *is*.

FINOS Common Cloud Controls (CCC) is that language: capabilities, threats and controls that financial institutions and vendors can reuse, map to regulation, and — where possible — check against a running system. The prize is not a conversation. It is **faster reviews**, **fewer cross-cloud gaps**, and **evidence** boards and regulators can follow.

This note introduces the CCC user journeys. The two firm stories that follow — RBC and Morgan Stanley — are the detail.

## Who CCC is for

Two generic paths, then two named firms.

**[Financial institutions](/users/financial-institutions)** already have policies, control libraries and dedicated cloud-security teams. They need a consistent way to assess services across AWS, Azure and Google Cloud, map technical controls to internal and regulatory requirements, and see which of those controls can be tested.

**[Smaller organisations](/users/smaller-organizations)** often have one person wearing security, platform and compliance hats. They need a structured checklist and a place to start — identity, exposure, encryption, logging, data protection — without inventing a full control framework.

Those are the use cases. The user journeys that follow are how two member banks are actually walking them.

## Two journeys, different stages

**[RBC](/users/RBC)** is using CCC in production as the provider-neutral catalogue inside its cloud-review process: service threats and controls, threat modelling, validation, pen-test, and a risk scorecard for the governance board before production approval. Maxime Coquerel’s talk is the source. The story is *control intent versus policy widgets* — encryption in transit is one control, Azure Policy and AWS Config are two implementations.

**[Morgan Stanley](/users/Morgan-Stanley)** is investing and contributing, starting with managed Kubernetes. Dave Reeve’s talk is the source: three control tables for AKS, EKS and GKE that did not match, and a spreadsheet that could not evidence a deployment. What has landed in FINOS is the `CCC.K8S` catalog, a hardened AKS Terraform blueprint, and behavioural tests across AWS, Azure and GCP. EKS and GKE *modules* are still planned.

