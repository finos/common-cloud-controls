# Common Cloud Controls - User Journeys

This report looks at how RBC and Morgan Stanley are using and contributing to FINOS Common Cloud Controls (CCC). RBC’s journey shows how CCC fits into an established cloud-review and production-approval process. Morgan Stanley’s follows the development of shared Kubernetes requirements, an AKS blueprint and behavioural tests. Together, they show what adopting CCC involves, what is already in use and where work remains.

## Problem Statement

Using several cloud providers can help banks manage concentration risk, but it also adds work. Each provider has different services, configuration options and security tooling. Banks have to establish whether those differences affect the protection a control provides—and produce evidence to support that assessment.

FINOS Common Cloud Controls (CCC) gives firms a common basis for this work. It defines cloud-service capabilities, threats and controls independently of any provider, with mappings to regulatory and industry frameworks. Behavioural tests check whether deployed services meet the control requirements. The aim is to reduce repeated assessment work, identify gaps across providers and produce evidence that supports risk decisions.

RBC and Morgan Stanley are approaching this from different starting points. RBC is using CCC within its cloud-review process. Morgan Stanley is contributing requirements, infrastructure code and tests, beginning with managed Kubernetes.

## Who CCC is for

Financial institutions can use CCC alongside their existing policies and control libraries. It provides a consistent reference for assessing services across AWS, Azure and Google Cloud, linking technical controls to internal and regulatory requirements, and identifying what can be tested.

For smaller organisations with fewer security and compliance resources, the catalogues provide a starting point. Teams can work through requirements for identity, network exposure, encryption, logging and data protection, then adapt them to their own systems and risks.

## User Journeys

The following user journeys show two approaches to CCC adoption. RBC is using it to bring consistency to cloud-service reviews, while Morgan Stanley is contributing shared requirements, infrastructure blueprints and behavioural tests, starting with managed Kubernetes. Both offer practical experience for firms considering how CCC could fit into their own cloud governance.
