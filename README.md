<!-- markdownlint-disable MD041 -->

[![FINOS - Incubating](https://cdn.jsdelivr.net/gh/finos/contrib-toolbox@master/images/badge-incubating.svg)](https://finosfoundation.atlassian.net/wiki/display/FINOS/Incubating)

<!-- markdownlint-enable MD041 -->

<a href="https://ccc.finos.org"><img height="100px" src="https://github.com/finos/branding/blob/master/project-logos/active-project-logos/FINOS%20Common%20Cloud%20Controls%20Logo/Horizontal/2023_FinosCCC_Horizontal.svg?raw=true" alt="CCC Logo"/></a>

FINOS Common Cloud Controls (FINOS CCC) is an open standard project that describes consistent controls for compliant public cloud deployments in the financial services (FS) sector.

This standard is a collaborative project which aims to develop a unified set of cybersecurity, resiliency, and compliance controls for common services across the major cloud service providers (CSPs).

## How To Use It

- **For controls development:** Download the latest [release PDF or Markdown](https://github.com/finos/common-cloud-controls/releases) for your target service, and use that as the basis for developing a control catalog for your specific organization or use case

- **For automation development:** Download the latest [release YAML for your target service](https://github.com/finos/common-cloud-controls/releases), and build tests for each “Test Requirement,” organized according to the control they are part of. Open source validators are currently being developed by the [Compliant Financial Infrastructure](https://github.com/finos/compliant-financial-infrastructure) project.

## How To Contribute

There are several ways to contribute to FINOS Common Cloud Controls.

### 1. Improving CCC

FINOS CCC is maintained and run through GitHub.

- Check [the issues](https://github.com/finos/common-cloud-controls/issues) to see if there's anything you'd like to work on.
- CCC follows an iterative process, so you can suggest changes to the standard at any time. Simply [Raise a GitHub Issue](https://github.com/finos/common-cloud-controls/issues/new/choose) to ask questions or make suggestions.
- If you see something in the repo that you'd like to improve, Pull Requests are always welcome - the main branch of the repo is considered an iterative development branch.

### 2. Join FINOS CCC Project Meetings

The CCC project is split into 6 working groups as follows:

- **Communications / All Hands**: Focused on the overall project communications and community engagement.
- **Security** - Working to specify the security controls and threats that will be covered by the standard.
- **Community Structure** - Focused on the governance and structure of the CCC project.
- **Duplication Reduction** - Focused on ensuring that the CCC standard does not duplicate existing standards.
- **Taxonomy** - Focused on defining the taxonomy of cloud services that will be covered by the standard.
- **Delivery** - Focused on the delivery of the CCC standard for use downstream by FS firms and CSPs.

Work is done in the open, with all meetings and decisions documented in the project GitHub repository. Working groups meet on a fortnightly basis:

| Working Group                                                                             | When                                       | Chair                | Mailing List                                                              |
| ----------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------- | ------------------------------------------------------------------------- |
| [Security](/docs/governance/working-groups/security/charter.md)                           | 4PM UK, 1st and 3rd Thursday each month    | @mlysaght2017        | [ccc-security](mailto:ccc-security+subscribe@lists.finos.org)             |
| [Delivery](/docs/governance/working-groups/delivery/charter.md)                           | 4:30PM UK, 1st and 3rd Thursday each month | @damienjburks        | [ccc-delivery](mailto:ccc-delivery+subscribe@lists.finos.org)             |
| [Communications / All Hands](/docs/governance/working-groups/communications/charter.md)   | 5PM UK, 1st and 3rd Thursday each month    | @Alexstpierrework    | [ccc-communications](mailto:ccc-communications+subscribe@lists.finos.org) |
| [Taxonomy](/docs/governance/working-groups/taxonomy/charter.md)                           | 4:30PM UK, 2nd and 4th Thursday each month | @smendis-scottlogic  | [ccc-taxonomy](mailto:ccc-taxonomy+subscribe@lists.finos.org)             |
| [Community Structure](/docs/governance/working-groups/community-structure/charter.md)     | 5PM UK, 2nd and 4th Thursday each month    | @sshiells-scottlogic | [ccc-structure](mailto:ccc-structure+subscribe@lists.finos.org)           |
| [Duplication Reduction](/docs/governance/working-groups/duplication-reduction/charter.md) | 5:30PM UK, 2nd and 4th Thursday each month | @jared-lambert       | [ccc-duplication](mailto:ccc-duplication-reduction@lists.finos.org)       |

Find the next meeting on the [FINOS Community Calendar](https://finos.org/calendar) and browse [Past Meeting Minutes in GitHub](https://github.com/finos/common-cloud-controls/labels/meeting).

### 3. Join the FINOS CCC Mailing Lists

FINOS CCC communications are conducted through the <ccc-participants@lists.finos.org> mailing list. Simply email [ccc-participants+subscribe@lists.finos.org](mailto: <ccc-participants+subscribe@lists.finos.org>) to join.

### FINOS CSLA Needed to Participate in CCC

All FINOS CCC participants are required to sign a FINOS [Community Specification Contributor License Agreement](https://github.com/finos/standards-project-blueprint/blob/main/governance-documents/Getting%20Started.md#best-practices) before joining project calls and collaborating in working groups.

Raising a Pull Request to include your information on [participants.yaml](participants.yaml) will automatically take you through the Linux Foundation EasyCLA process for signing the FINOS [CSCLA](https://github.com/finos/standards-project-blueprint/blob/main/governance-documents/Getting%20Started.md#best-practices).

Email <help@finos.org> if you require further help.

### FINOS Code of Conduct

Participants of FINOS standards projects should follow the FINOS Code of Conduct, which can be found at: <https://community.finos.org/docs/governance/code-of-conduct>

## Governance

### FINOS CCC Steering Committee

The CCC Steering Committee is the governing body of the CCC project, providing decision-making and oversight pertaining to the CCC project bylaws, sub-organizations, and financial planning. The Steering Committee also defines the project values and structure. [Documented here](docs/governance/steering/charter.md).

| Name             | Representing   | Seat      |
| ---------------- | -------------- | --------- |
| Jon Meadows      | Citi           | FSI       |
| Oli Bage         | LSEG           | FSI       |
| Simon Zhang      | BMO            | FSI       |
| Vladimir Rabotka | Morgan Stanley | FSI       |
| Robert Griffiths | Scott Logic    | Community |
| Eddie Knight     | Sonatype       | Community |
| Aric Rosenbaum   | Red Hat        | Community |

@robmoffat is the current [FINOS Point of Contact](docs/governance/finos-poc.md) for the CCC project.

## License

This project uses the **Community Specification License 1.0**; you can read more in the [LICENSE](LICENSE) file.

The source code included in this repository is subject to the [Apache-2.0 License](https://www.apache.org/licenses/LICENSE-2.0).
