# What to take from these journeys

RBC and Morgan Stanley are approaching CCC from different directions. One is already using it in the review process for production deployments. The other is contributing Kubernetes requirements, an AKS blueprint and tests to FINOS, giving other firms a starting point they can use and improve. Both efforts are still developing.

Both are chasing the same things: reviews that take less time, fewer gaps when the same control looks different on each cloud, and evidence that follows the control rather than a pile of Azure Policy and AWS Config.

## Work with the Cyber Risk Institute

The Cyber Risk Institute (CRI) is tackling a related problem through its [Cloud Profile](https://cyberriskinstitute.org/cloud-profile/): helping banks and cloud providers agree on what secure cloud adoption requires, who is responsible for each part, and what evidence they should provide. Developed with cloud providers and financial-sector partners, it extends the CRI Profile with cloud-specific guidance. Version 2.0 includes a shared responsibility checklist, a guidebook with examples of evidence, and mappings to UK and EU cloud frameworks.

CCC complements this with technical controls for individual cloud services and behavioural tests to check that those controls work in practice. A configuration can look correct without delivering the intended protection. Behavioural tests exercise the deployed service and check what actually happens—for example, whether an unauthorised operation is refused. The results provide evidence that engineers and risk teams can use when reviewing a deployment.

The connection is already visible in the [managed Kubernetes catalog](https://ccc.finos.org/catalogs/orchestration/k8s), which maps technical controls to CRI Profile statements alongside NIST and other frameworks. The aim is to make the whole chain traceable: from the bank’s risk requirements, through the controls implemented in its cloud services, to test results showing whether those controls are effective. That gives the Cloud Profile’s expectations a practical route into engineering and gives engineering evidence a clear place in the bank’s assurance process.

That evidence is more useful when it lines up with the frameworks like CRI that banks already take to the board and the regulator.  You can already see it on [managed Kubernetes](https://ccc.finos.org/catalogs/orchestration/k8s): each CCC.K8S control lists the CRI statements it supports, alongside NIST and the rest.

## Going Further

The next step is for more firms to try the catalogues, blueprint and tests, and contribute what they find missing. Each contribution means less work for the next firm—and makes it easier to apply and verify the same requirements across cloud providers. That gives banks more practical options when deciding where to run their services, which is part of addressing concentration risk and rework across the industry.

If you want to go further, browse the [CCC website](https://ccc.finos.org), use or contribute to [the common-cloud-controls GitHub project](https://github.com/finos/common-cloud-controls) or join the project meetings via an invite from the [FINOS Calendar](https://calendar.finos.org).
