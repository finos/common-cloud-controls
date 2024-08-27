# Control Definitions

A control definitions document is a detailed specification of security measures designed to mitigate risks and ensure compliance with established standards and frameworks. It must contain a list of all controls that pertain to a specific service category, along with relevant supporting information.

A set of control definitions should be created for each service in the CCC Taxonomy, with each control in the document mapped to a feature of that service. A set of behavioral test definitions may be provided alongside the control definition in Gherkin to support validation of the controls.

## Control Definition Format

In order to create a cohesive standard that is readily useful to end users, controls must be indistinguishable from each other in format, style, and tone. A review from the [Communications WG] is recommended, but not required, in cases where additional support is needed to match the writing style and tone.

Similarly, all controls must match the layout presented in the [control template](../templates/controls.yaml) prior to release.

The following list outlines the values necessary to create a new control definition using the control template:

- **Control ID** - A unique identifier for the control, following the format `CCC.<Service Category Abbreviation>.C#`.
- **Feature ID** - The corresponding feature ID that this control is associated with.
- **Control Title** - A brief title (3 to 10 words) that succinctly describes the control.
- **Objective** - A 1 to 3 sentence description of the control’s objective and what it aims to achieve.
- **Control Family** - Name of the [Control Family](#control-family) this group belongs to.
- **NIST CSF** - The specific ID from the NIST Cybersecurity Framework that corresponds to the control.
- **MITRE ATT&CK** - The unique identifier for the MITRE ATT&CK Tactics, Techniques, and Procedures (TTP) relevant to the control.
- **Threats** - A list of IDs for CCC threats that this control is designed to mitigate.
- **Control Mappings** - Identifiers for other frameworks (e.g., CCM, ISO 27001, NIST 800-53) that map to this control.
- **Test Requirements** - Detailed descriptions of the testing requirements needed to validate the control’s implementation.

### Control Family

Control family refers to a group of related security controls that are organized together based on their similar functions or objectives. Each control family addresses a particular aspect of information security.

The following list should be updated in the event that a new control family is added to the CCC Controls Catalog:

- Encryption
- Data
- Identity and Access Management
- Logging & Monitoring
- Software Supply Chain


[Communications WG]: ../../working-groups/communications/charter.md
