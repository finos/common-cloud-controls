# Threat Definitions

This document outlines potential security threats for specific service categories within the CCC Taxonomy. It serves as a reference to ensure that threats are consistently documented, mapped to relevant features, and integrated into threat models.

Each threat definition corresponds to a service in the CCC Taxonomy, with every threat linked to a specific feature and relevant threat models.

## Common vs. Specific Threats

To streamline maintenance, the CCC project maintains a list of [common threats].

Each service category’s `threats.yaml` file references these common threats by listing their IDs under the top-level `common_threats` value. During the release pipeline, our [delivery tooling] compiles these common threats into the final document alongside any service-specific threats. In the final output, both types of threats are presented consistently, with the unique identifier being the only difference.

### Common Threats

- Common threats are reusable across multiple service categories. They are documented once in the [common threats] file and referenced where applicable.
- These threats streamline the process by reducing redundancy and providing a consistent baseline across service categories.

### Specific Threats

- Specific threats are unique to a particular service category.
- If a threat is relevant to multiple categories, consider whether it should be generalized and added to the common threats list.

## Threat Documentation Process

When creating or updating a `threats.yaml` file for a service category, follow these steps:

1. **Review Common Threats**: Start by reviewing the [common threats] list. If any common threats apply to this category, reference them by adding their IDs to the `common_threats` list.
2. **Define Specific Threats**: If a threat is unique to the service category, document it in the `threats` section of the `threats.yaml` file.
3. **Consider Generalization**: If a specific threat could apply to at least three other service categories, evaluate whether it can be generalized and added to the [common threats] list.

## Threat Definition Format

To maintain consistency, all threats—whether common or specific—must follow the same format, style, and tone. Each threat should adhere to the [threats template] before release.

### Threat Definition Values

When creating a new threat definition, use the following values:

- **Threat ID** (`id`): A unique identifier for the threat, following the format `<category-id>.TH<#>`.
- **Threat Title** (`title`): A short name or title that succinctly describes the threat.
- **Threat Description** (`description`): A detailed description of the threat, including its nature and potential impact.
- **Feature IDs** (`features`): A list of IDs for the corresponding CCC features that this threat is associated with.
- **MITRE ATT&CK** (`mitre_attack`): A list of relevant MITRE ATT&CK tactic and technique IDs.
- **Threat Models** (`threat_models`): URLs for any threat models used to develop this threat (omit if not applicable).

### Review Process

Although a review from the [Communications WG] is optional, it may be useful if additional support is needed to match the writing style or tone of the document.

This structure ensures that threats are standardized and can be consistently identified and addressed across all services within the CCC Taxonomy.

[common threats]: /services/common-threats.yaml
[Communications WG]: ../../working-groups/communications/charter.md
[delivery tooling]: /delivery-tooling
[threats template]: ../templates/threats.yaml
