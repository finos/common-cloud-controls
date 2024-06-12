[![FINOS - Incubating](https://cdn.jsdelivr.net/gh/finos/contrib-toolbox@master/images/badge-incubating.svg)](https://finosfoundation.atlassian.net/wiki/display/FINOS/Incubating)

<img height="100px" src="https://github.com/finos/branding/blob/master/project-logos/active-project-logos/FINOS%20Common%20Cloud%20Controls%20Logo/Horizontal/2023_FinosCCC_Horizontal.svg?raw=true"/>

## What Is It?

FINOS Common Cloud Controls (FINOS CCC) is the codename for an open standard project, originally proposed by Citi and currently incubating in FINOS, to describe consistent controls for compliant public cloud deployments in the financial services sector.

This standard is a collaborative project which aims to develop a unified set of cybersecurity, resiliency, and compliance controls for common services across the major cloud service providers (CSPs).

## What Are The Benefits?

#### 💯 Defining Best Practices Around Cloud Security

> CCC aims to standardize cloud security controls for the banking sector, providing a common set of controls that CSPs can implement to meet the requirements of FS firms. As multiple FS firms are involved in the project, effort is shared, the controls will be representative of the sector as a whole, and be more robust than any one firm could develop on its own.

#### 🎯 One Target For CSPs To Conform To

> If all FS firms specify their own cloud infrastructure requirements, CSPs will have to conform to multiple standards. CCC aims to provide a single target for CSPs to conform to.

#### 🎒 Sharing The Burden Of A Common Definition

> CCC aims to reduce the burden of compliance for CSPs by providing a common definition of controls which they can adopt. As CCC controls are specified in a cloud-agostic way, CSPs can implement them in a way that is consistent with their own infrastructure, while delivering services that FS firms understand and trust.

#### 🧭 A Path Towards Common Implementation

> FINOS sister project, [Compliant Financial Infrastructure](https://github.com/finos/compliant-financial-infrastructure) aims to be a downstream implementation of the CCC controls standard. In tandem with CCC, this will provide FS firms with a one-stop shop for secure cloud infrastructure deployment.

#### 🥇 A Path Towards Certification

> It is envisaged that eventually, CCC will offer _certification_ for CSPs who conform to the standard.

## How Does It Work?

The CCC project is in **incubation** at the moment but aims to deliver its first standards in 2024. The project is split into 6 working groups, each with a specific focus:

- **Communications / All Hands**: Focused on the overall project communications and community engagement.
- **Security** - Working to specify the security controls and threats that will be covered by the standard.
- **Community Structure** - Focused on the governance and structure of the CCC project.
- **Duplication Reduction** - Focused on ensuring that the CCC standard does not duplicate existing standards.
- **Taxonomy** - Focused on defining the taxonomy of cloud services that will be covered by the standard.
- **Delivery** - Focused on the delivery of the CCC standard for use downstream by FS firms and CSPs.

Work is done in the open, with all meetings and decisions documented in the project GitHub repository.

## Get Involved with FINOS Common Cloud Controls

There are several ways to contribute to FINOS Common Cloud Controls.

### Join FINOS CCC Project Meetings

The CCC project is split into 6 working groups in the CCC project which meet on a fortnightly basis:

| Working Group                                                                             | Meeting Cadence | When                                       | Chair                |
| ----------------------------------------------------------------------------------------- | --------------- | ------------------------------------------ | -------------------- |
| [Communications / All Hands](/docs/governance/working-groups/communications/charter.md)   | Fortnightly     | 5PM UK, 1st and 3rd Thursday each month    | @Alexstpierrework    |
| [Security](/docs/governance/working-groups/security/charter.md)                           | Fortnightly     | 4PM UK, 1st and 3rd Thursday each month    | @mlysaght2017        |
| [Community Structure](/docs/governance/working-groups/community-structure/charter.md)     | Fortnightly     | 5PM UK, 2nd and 4th Thursday each month    | @sshiells-scottlogic |
| [Duplication Reduction](/docs/governance/working-groups/duplication-reduction/charter.md) | Fortnightly     | 5:30PM UK, 2nd and 4th Thursday each month | @jared-lambert       |
| [Taxonomy](/docs/governance/working-groups/taxonomy/charter.md)                           | Fortnightly     | 4:30PM UK, 2nd and 4th Thursday each month | @smendis-scottlogic  |
| [Delivery](/docs/governance/working-groups/delivery/charter.md)                           | Fortnightly     | 4:30PM UK, 1st and 3rd Thursday each month | @damienjburks        |

Find the next meeting on the [FINOS Community Calendar](https://finos.org/calendar) and browse [Past Meeting Minutes in GitHub](https://github.com/finos/common-cloud-controls/labels/meeting).

### Join the FINOS Common Cloud Controls Mailing Lists

FINOS Common Cloud Controls communications are conducted through the ccc-participants@lists.finos.org mailing list. Simply email [ccc-participants+subscribe@lists.finos.org](mailto: ccc-participants+subscribe@lists.finos.org) to join.

Other working groups have an email list too. Too join those, simply email to the addresses below:

ccc-delivery+subscribe@lists.finos.org
ccc-duplication-reduction@lists.finos.org
ccc-taxonomy+subscribe@lists.finos.org
ccc-security+subscribe@lists.finos.org
ccc-structure+subscribe@lists.finos.org

### Raise a FINOS Common Cloud Controls GitHub Issue

FINOS Common Cloud Controls is maintained and run through GitHub. Simply [Raise a GitHub Issue](https://github.com/finos/common-cloud-controls/issues/new/choose) to ask questions or make suggestions.

### FINOS CSLA Needed to Participate in Common Cloud Controls

All FINOS Common Cloud Controls participants are required to sign a FINOS [Community Specification Contributor License Agreement](https://github.com/finos/standards-project-blueprint/blob/main/governance-documents/Getting%20Started.md#best-practices) before joining project calls and collaborating in working groups.

Please visit [participants.md](participants.md) and raise a Pull Request by adding your `name`, `organisation` and `enrollment date` to the markdown file.

Raising a Pull Request on [participants.md](participants.md) will automatically take you through the Linux Foundation EasyCLA process for signing the FINOS [CSCLA](https://github.com/finos/standards-project-blueprint/blob/main/governance-documents/Getting%20Started.md#best-practices).

Email help@finos.org if you require further help.

### FINOS Code of Conduct

Participants of FINOS standards projects should follow the FINOS Code of Conduct, which can be found at: <https://community.finos.org/docs/governance/code-of-conduct>

## Governance

### FINOS CCC Steering Committeee Members

The CCC Steering Committee is the governing body of the CCC project, providing decision-making and oversight pertaining to the CCC project bylaws, sub-organizations, and financial planning. The Steering Committee also defines the project values and structure. [Documented here](docs/governance/steering/charter.md).

| FINOS CCC Maintainer | Representing   | Seat      |
| -------------------- | -------------- | --------- |
| Jon Meadows          | Citi           | FSI       |
| Oli Bage             | LSEG           | FSI       |
| Simon Zhang          | BMO            | FSI       |
| Paul Stevenson       | Morgan Stanley | FSI       |
| Robert Griffiths     | Scott Logic    | Community |
| Eddie Knight         | Sonatype       | Community |
| Adrian Hammond       | Red Hat        | Community |

## License

This project uses the **Community Specification License 1.0**; you can read more in the [LICENSE](LICENSE) file.

The source code included in this repository is subject to the [Apache-2.0 License](https://www.apache.org/licenses/LICENSE-2.0).
