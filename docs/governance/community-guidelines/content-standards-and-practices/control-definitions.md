# Control Definitions

A control definitions document is a detailed specification of security measures designed to mitigate risks and ensure compliance with established standards and frameworks. It must contain a list of all controls that pertain to a specific service category along with relevant supporting information.

A control definition should be created for each service in the CCC Taxonomy, with each control in the document mapped to a feature on that service. A set of behavioral test definitions may be provided alongside the control definition in Gherkin to support validation of the controls.

## Control Definition Format

In order to create a cohesive standard that is readily useful to end users, controls must be indistinguishable from eachother in format, style, and tone. As such, all controls must match the layout presented in the [control template](../templates/control.md) prior to release.

This following list outlines the values necessary to create a new control definition using the control template.

- `Control Description` - This is a 1 to 2 sentence description of this control, and what it achieves.
- `Control Incrementer` - A sequential number or identifier for each control. This must not be changed or reused once assigned.
- `Control Title` - This is a 3 to 10 word title that succintly describes the control.
- `Corresponding Control ID` - The identifiers for other controls that are related or linked to the current control.
- `NIST CSF Category` - This indicates the relevant category from the NIST Cybersecurity Framework that the control addresses.
- `NIST CSF ID` - The specific ID from the NIST Cybersecurity Framework that corresponds to the control.
- `Service Name` - This is the name of the service, which must match the name value provided by the corresponding taxonomy entry.
- `Service Name Shorthand` - This is the short version of the service name, such as "OS" for "Object Storage", which should match the corresponding taxonomy entry.
- `Service Identifier` - This is the unique identifier assigned in the taxonomy entry for a service.
- `Test Requirement Description` - A detailed description of the testing requirements needed to validate the control’s implementation.
- `TTP ID` - This is the unique identifier for the MITRE ATT&CK Tactics, Techniques, and Procedures (TTP) relevant to the control.
- `TTP Name` - The name associated with the MITRE ATT&CK TTP ID.
- `Version Identifier` - This denotes the version of the service or control and should be updated with each release.

## Example

```markdown
# CCC.OS: Object Storage v25.07

| Control Id | Service Taxonomy Id | Control |
|---|---|---|
| CCC.OS.C1 | CCC-020114 | Prevent unencrypted requests to object storage bucket |
| CCC.OS.C2 | CCC-020115 | Ensure data is encrypted in transit |
| CCC.OS.C3 | CCC-020116 | Implement access controls for object storage |

---

## CCC.OS.C1: Prevent unencrypted requests to object storage bucket

- **Corresponding Feature:** CCC-020114 (Object Storage)
- **NIST CSF:** Protect (PR.DS-2)
- **MITRE ATT&CK TTP:** T1040 - Network Sniffing

### Objective

Prevent any unencrypted HTTP requests to the object storage bucket, ensuring that all communications are encrypted in transit to protect data integrity and confidentiality.

### Control Mappings

- CCM: IVS-09, DSI-03

### Testing Requirements

The following behavioral test validations must be performed against an implementation of CCC-020114 to ensure the Control Objective is thoroughly assessed.

1. CCC.OS.C1.01: All supported network data protocols must be running on [secure channels](link).
2. CCC.OS.C1.02: All [clear text channels](link) should be disabled.
3. CCC.OS.C1.03: The cipher suite implemented for ensuring the integrity and confidentiality of data should conform with the latest [suggested cipher suites](link).
```