# OSCAL Examples

This directory contains OSCAL examples in XML, JSON, and YAML formats based on [the latest OSCAL stable release](github.com/usnistgov/OSCAL/releases/latest). The intention of those examples is to explore best ways of representing the Cloud Common Controls and associate data that supports the assessement process FINOS is establishing. 

The examples provided have been validated using the `oscal-cli` tool. For more information about the tool, please visit [NIST's oscal-cli repository](https://github.com/usnistgov/oscal-cli). NIST reserves the right to stop maintaining the tool at any time in the future, so the long term used of the tool needs to be decided with care. As of 02/09/2024, the version of `oscal-cli` is v1.0.3 and it implements OSCAL v1.1.2. A simple Makefile is also provided and can be invoked to install the `oscal-cli` tool in any local clone, in the [../../build/oscal-cli](../../build/oscal-cli) sub-directory. The .gitignore file is used to ignore committing the tool to the repository. A pipeline could use the Makefile to accomplish similar installation and artifacts' validation or conversion between formats.

If desired, in the future, the Makefile can be invoked by a CI/CD pipeline to automatically validate the generated OSCAL content.

The structure and contents of the examples directory are as follows:

- [examples](./examples): This directory contains sample OSCAL content organized by OSCAL models. 
- [examples/catalog](./examples/catalog): This directory contains sample OSCAL content organized by OSCAL models.
- [examples/catalog/xml](./examples/catalog/xml): XML representations of the OSCAL CCC catalog examples.
- [examples/catalog/json](./examples/catalog/json): JSON representations of the OSCAL CCC catalog examples.
- [examples/catalog/yaml](./examples/catalog/yaml): YAML representations of the OSCAL CCC catalog examples.

Different formats of the same content have been regenerated with the `oscal-cli` tool for consistency and accuracy of the data represented.

OSCAL models provide sufficient flexibility to adept their use to the employed risk management process. It is not sufficient to represent the information in valid OSCAL format if the way data is captured in OSCAL does not support the employed risk management process and targeted compliance reporting. For example:
- [ ] is it sufficient to assess and report the status of the logical controls, or 
- [ ] is it expected to include in the reports which threat mitigations are addressed, and 
- [ ] map each mitigation to the identified threat(s) per each category the threat belongs to.
