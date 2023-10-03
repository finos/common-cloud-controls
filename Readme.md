[![FINOS - Forming](https://cdn.jsdelivr.net/gh/finos/contrib-toolbox@master/images/badge-forming.svg)](https://github.com/finos/community/blob/master/governance/Software-Projects/Project-Lifecycle.md#forming-projects-optional)

# Common Cloud Controls

Common Cloud Controls (CCC) is the codename for an open standard project, originally proposed by Citi and currently undergoing formation in FINOS, to describe consistent controls for compliant public cloud deployments in the financial services sector.

This standard is a collaborative project which aims to develop a unified set of cybersecurity, resiliency, and compliance controls for common services across the major cloud service providers (CSPs).

You can read more on [finos.org/common-cloud-controls-project](https://www.finos.org/common-cloud-controls-project).

## ➡️ FINOS CSLA Needed to Participate in Common Cloud Controls

All Common Cloud Controls participants are required to sign a FINOS [Community Specification Contributor License Agreement](https://github.com/finos/standards-project-blueprint/blob/main/governance-documents/Getting%20Started.md#best-practices) before joining project calls and collaborating in working groups.

Please visit [participants.md](participants.md) and raise a Pull Request by adding your `name`, `organisation` and `enrollment date` to the markdown file. 

Raising a Pull Request on [participants.md](participants.md) will automatically take you through the Linux Foundation EasyCLA process for signing the FINOS [CSCLA](https://github.com/finos/standards-project-blueprint/blob/main/governance-documents/Getting%20Started.md#best-practices).

Email help@finos.org if you require further help.

# CCC Working Group Roadmaps

The following highlights the first iteration of Common Cloud Controls project delivery roadmaps as created in GitHub issue [The creation of a Common Cloud Controls 30, 60, 90 day plan #13](https://github.com/finos/common-cloud-controls/issues/13)

### NIST / OSCAL Working Group Roadmap

1. [Define vision and purpose for OSCAL Representation of CCC working group #42](https://github.com/finos/common-cloud-controls/issues/42)
    - Define the end target for the working group.
    - For example, stop regenerating processes. 
2. [Define whether the working group wants to create a repo of component definitions #43](https://github.com/finos/common-cloud-controls/issues/43)
    - Define whether the working group wants to create an OSCAL catalog?
    - Define whether the group needs a repo that is friendly for managing OSCAL content, catalogs and service definitions?
    - Define whether the repo be a database or a GitHub repo?
      - Potential for GitHub repo(s) that can be contributed via pull request
      - Potential for cloud object storage that can be indexed and displayed. 
      - Potential for delivery pipeline from GitHub repo into other hosted service
3. [Define the tooling that should be used by the group / open source community #44](https://github.com/finos/common-cloud-controls/issues/44)
    - Should OSCAL be written by hand?
    - How are the services described as OSCAL?
    - Are there any editorial tools that enable automation of OSCAL? 
    - How should contributions be validated and accepted?
    - Maybe other collaboration and editing solutions are better for the team?
4. [Define which cloud service providers are accepting the initial OSCAL definitions #45](https://github.com/finos/common-cloud-controls/issues/45)
    - Investigate and define how are their services implemented and tested?
7. [Implement an initial cloud service example that demonstrates a steel thread across working groups. #46](https://github.com/finos/common-cloud-controls/issues/46)
    - Pick initial common cloud services to define 
    - Allocate MITRE threats and apply OSCAL mitigations
    - Write Gherkin tests to describe service configuration expectations
       - Work with CSPs on how Gherkin should be interpreted via cloud APIs

### Taxonomy Working Group Roadmap
- **August 24th 2023**
  - Present initial problem statement and objectives. 
  - Reference FinOps Foundation and ARC work
  - Agree to objectives and timelines.
  - Identify volunteer leads. 
    - Propose priority services
    - Propose taxonomy of first common service 
    - Propose top level of Taxonomy

- **September 28th 2023**
  - Agree to priority services (Kubernetes, Object Storage, etc…)
  - Discuss taxonomy of first common service
  - Discuss top level of Taxonomy
  - Identify volunteer leads
    - Finalize priority services
    - Finalize taxonomy of first common service
    - Finalize top level taxonomy
    - Propose second level taxonomy

- **October 26th 2023**
  - Approve priority services
  - Approve taxonomy of first common service
  - Approve top level taxonomy
  - Discuss second level taxonomy
  - Identify volunteer leads
    - Finalise second level taxonomy
    - Define common capability qualifiers for priority services
 
## Registering Your Interest with FINOS

Fill in the form available at [finos.org/common-cloud-controls-project](https://www.finos.org/common-cloud-controls-project) to register your interest in participating in the project. If you are not a FINOS Member, you can apply for membership [here](https://enrollment.lfx.linuxfoundation.org/?project=finos).

There are several ways to contribute to Common Cloud Controls:

* **Join the next meeting**: participants of the Common Cloud Controls workstream meet... {TODO - meeting cadance}.

Find the next meeting on the [FINOS projects calendar](https://finos.org/calendar) and browse [past meeting minutes in GitHub](https://github.com/finos/common-cloud-controls/labels/meeting).

* **Join the mailing list**: Communications for the Common Cloud Controls project are conducted through the ccc-participants@lists.finos.org mailing list. Please email [ccc-participants@lists.finos.org](mailto:ccc-participants@lists.finos.org) to join the mailing list.

* **Raise an issue**: if you have any questions or suggestions, please [raise an issue](https://github.com/finos/common-cloud-controls/issues/new/choose)

## License

This project uses the **Community Specification License 1.0** ; you can read more in the [LICENSE](LICENSE) file.

The source code is included in this repository is subject to the [Apache-2.0 License](https://www.apache.org/licenses/LICENSE-2.0).
