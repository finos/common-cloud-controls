# Control Definitions

A control definitions document provides a detailed specification of security measures designed to mitigate risks and ensure compliance with established standards and frameworks. It includes a list of all controls relevant to a specific service category, along with supporting information.

Each service category in the CCC Taxonomy should have its own set of control definitions, with each control mapped to known [threats]. Optionally, behavioral test definitions in Gherkin can be provided alongside the control definitions to streamline validation.

## Common vs. Specific Controls

To streamline maintenance, the CCC project maintains a list of [common controls].

Each service category’s `controls.yaml` file references these by listing their IDs under the top-level `common_controls` value. During the release pipeline, our [delivery tooling] compiles these common controls into the final document alongside any specific controls. In the final output, both types of controls are presented consistently, with the unique identifier being the only difference.

### Common Controls

- Common controls are reusable across multiple service categories. They are documented once in the [common controls] file and referenced where applicable.
- These controls streamline the process by reducing redundancy and ensuring consistency across service categories.

### Specific Controls

- Specific controls are unique to a particular service category.
- If a control is relevant to multiple categories, consider whether it should be generalized and added to the common controls list.

## Control Documentation Process

When creating or updating a `controls.yaml` file for a service category, follow these steps:

1. **Review Common Controls**: Start by reviewing the [common controls] list. If any common controls apply to this category, reference them by adding their IDs to the `common_controls` list.
2. **Define Specific Controls**: If a control is unique to the service category, document it in the `specific_controls` section of the `controls.yaml` file.
3. **Consider Generalization**: If a specific control could apply to at least three other service categories, evaluate whether it can be generalized and added to the [common controls] list.

## Control Definition Format

To maintain consistency, all controls— whether common or specific— must follow the same format, style, and tone. Each control should adhere to the [control template](../templates/controls.yaml) before release.

### Control Definition Values

When creating a new control definition, use the following values:

- **Control ID** (`id`): A unique identifier for the control, following the format `<category-id>.C<#>`.
- **Control Title** (`title`): A brief title (3 to 10 words) that succinctly describes the control.
- **Objective (`objective`)**: A 1 to 3 sentence description outlining the control’s purpose and what it aims to achieve.
- **Control Family** (`family`): The name of the [Control Family](#control-family) this control belongs to.
- **CCC Threats** (`threats`): A YAML list of IDs for CCC [threats] that this control is designed to mitigate.
- **NIST CSF** (`nist_csf`): The specific ID from the NIST Cybersecurity Framework that corresponds to the control.
- **MITRE ATT&CK Technique** (`mitre_attack`): The unique identifier for the most relevant MITRE ATT&CK Technique.
- **External Control Mappings** (`control_mappings`): Identifiers for any other frameworks that map to this control (e.g., CCM, ISO 27001, NIST 800-53).
- **Validation Test Requirements** (`test_requirements`): Detailed descriptions of testing requirements necessary to validate the control’s implementation.

### Control Family

A control family refers to a group of related security controls that are organized together based on their similar functions or objectives. Each control family addresses a particular aspect of information security.

The list of control families is maintained in the [common controls] data.

[common controls]: /services/common-controls.yaml
[delivery tooling]: /delivery-tooling
[threats]: ./threat-definitions.md
