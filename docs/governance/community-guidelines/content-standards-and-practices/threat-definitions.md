# Threat Definitions

A threat definitions document is a detailed specification of potential security threats associated with a particular service category within the CCC Taxonomy. It serves as a reference to identify and describe various threats, ensuring they are consistently documented and mapped to relevant features and threat models.

Each threat definition should be created for a service in the CCC Taxonomy, with each threat mapped to a specific feature and linked to relevant threat models.

## Threat Definition Format

In order to create a cohesive standard that is readily useful to end users, threats must be indistinguishable from each other in format, style, and tone. A review from the [Communications WG] is recommended, but not required, in cases where additional support is needed to match the writing style and tone.

As such, all threats must match the layout presented in the [threat template](../templates/threats.yaml) prior to release.

The following list outlines the values necessary to create a new threat definition using the threat template:

- **Category Title** - The title of the service category this threat belongs to, formatted as `CCC <Service Category> Security Threats`.
- **Category ID** - A unique identifier for the service category, following the format `CCC.<Service Category Abbreviation>`.
- **Threat ID** - A unique identifier for the threat, following the format `<category-id>.TH<#>`.
- **Threat Title** - A short name or title that succinctly describes the threat.
- **Threat Description** - A complete description of the threat, detailing its nature and potential impact.
- **Feature ID** - The corresponding feature ID that this threat is associated with.
- **MITRE ATT&CK** - A list of MITRE ATT&CK tactic and technique IDs relevant to the threat.
- **Threat Models** - URLs to the threat models used to form this threat; omit this if not applicable.

This structure ensures that threats are standardized and can be consistently identified and addressed across all services within the CCC Taxonomy.

[Communications WG]: ../../working-groups/communications/charter.md
