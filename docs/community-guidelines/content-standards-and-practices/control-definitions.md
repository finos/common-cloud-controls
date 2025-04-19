# Control Definitions

A control definitions document provides a detailed specification of security measures designed to mitigate risks and ensure compliance with established standards and frameworks. It includes a list of all controls relevant to a specific service category, along with supporting information.

Each service category in the CCC Taxonomy should have its own set of control definitions, with each control mapped to known [threats]. Optionally, behavioral test definitions in Gherkin can be provided alongside the control definitions to streamline validation.

## Common vs. Specific Controls

To streamline maintenance, the CCC project maintains a list of [common controls].

Each service category’s `controls.yaml` file references these by listing their IDs under the top-level `common_controls` value. During the release pipeline, our [Delivery Toolkit] compiles these common controls into the final document alongside any specific controls. In the final output, both types of controls are presented consistently, with the unique identifier being the only difference.

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

To maintain consistency, all controls— whether common or specific— must follow the same format, style, and tone. Each control should adhere to the [control template](../../resources/templates/controls.yaml) before release.

### Control Definition Values

When creating a new control definition, use the following values:

- **Control ID** (`id`): A unique identifier for the control, following the format `<category-id>.C<#>`.
- **Control Title** (`title`): A brief title (3 to 10 words) that succinctly describes the control.
- **Objective (`objective`)**: A 1 to 3 sentence description outlining the control’s purpose and what it aims to achieve.
- **Control Family** (`family`): The name of the [Control Family](#control-family) this control belongs to.
- **CCC Threats** (`threats`): A YAML list of IDs for CCC [threats] that this control is designed to mitigate.
- **NIST CSF** (`nist_csf`): The specific ID from the NIST Cybersecurity Framework that corresponds to the control.
- **External Control Mappings** (`control_mappings`): Object where keys are other frameworks that map to this control (e.g., CCM, ISO 27001, NIST 800-53). The values will each contain a list of strings, representing the corresponding control mappings.
- **Validation Test Section** (`test_requirements`): Detailed descriptions of testing requirements necessary to validate the control’s implementation.
- **TLP Green Test Requirements** (`tlp_green`): A list of validation requirements for systems that intend limited disclosure, restricted to the community. ([ref])
- **TLP Amber Test Requirements** (`tlp_amber`): A list of validation requirements for systems that intend limited disclosure, recipients can only spread this on a need-to-know basis within their organization and its clients. ([ref])
- **TLP Red Test Requirements** (`tlp_red`): A list of validation requirements for systems intended for eyes and ears of individual recipients only, no further disclosure. ([ref])
- **TLP Clear Test Requirements** (`tlp_clear`): A list of validation requirements for systems containing data that recipients can spread this to the world, there is no limit on disclosure. ([ref])

### Control Family

A control family refers to a group of related security controls that are organized together based on their similar functions or objectives. Each control family addresses a particular aspect of information security.

The list of control families is maintained in the [common controls] data.

[common controls]: /services/shared-controls.yaml
[Delivery Toolkit]: /delivery-toolkit
[threats]: ./threat-definitions.md
[ref]: https://www.cisa.gov/sites/default/files/2023-02/tlp-2-0-user-guide_508c.pdf

## Style Guide for Test Requirements

### Structure

Test requirements must follow a **"When-Then-MUST/MUST NOT"** structure to ensure they are **actionable, specific, measurable, and verifiable**:

1. **When**: Describe the triggering condition or scenario under which the test is applied.
2. **Then**: Specify the expected outcome of the test in a clear and measurable manner.
3. Use **MUST** or **MUST NOT** to define mandatory conditions.

This approach ensures that test requirements are actionable by providing clear instructions for verification, making them easy to implement and audit.

> **Note:** The **Then** statement does not need to be explicitly written if the expected outcome is clearly implied by the **When** condition and the use of **MUST** or **MUST NOT**.

### Examples

#### Good Example

```yaml
test_requirements:
  - id: CCC.VPC.C01.TR01
    text: |
      When a subscription is created, the subscription MUST NOT
      contain default network resources.
    tlp_levels:
      - tlp_amber
      - tlp_red
```

#### Why It’s Good

- Clearly describes the triggering condition ("When a subscription is created").
- Specifies the measurable outcome ("MUST NOT contain default network resources").
- Provides clear verification criteria, making it actionable and easy to test.
- Aligns with the control objective by verifying a critical security configuration.

#### Bad Example

```yaml
test_requirements:
  - id: CCC.VPC.C01.TR01
    text: |
      A subscription MUST NOT have default networks.
    tlp_levels:
      - tlp_amber
      - tlp_red
```

#### Issues

- Missing the "When-Then" structure.
- Ambiguous context for the condition.
- Lacks specificity about how to verify the requirement.
- Does not align directly with the control objective or provide measurable verification.

### Best Practices

1. **Actionable Requirements**: Define test requirements that are specific, measurable, and verifiable.
2. **Clarity and Specificity**: Ensure test requirements clearly articulate the triggering condition and expected outcome.
3. **When-Then Structure**: Clearly define the triggering condition (_When_) and expected result (_Then_) for clarity.
4. **Mandatory Language**: Use **MUST** or **MUST NOT** to convey non-negotiable requirements.
5. **Avoid Ambiguity**: Avoid vague terms like "should" or "could."
6. **Alignment with Control Objective**: Ensure test requirements align with and verify the control objective effectively.
