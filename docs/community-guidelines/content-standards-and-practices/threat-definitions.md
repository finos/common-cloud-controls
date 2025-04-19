# Threat Definitions

This document outlines potential security threats for specific service categories within the CCC Taxonomy. It serves as a reference to ensure that threats are consistently documented, mapped to relevant capabilities, and integrated into threat models.

Each threat definition corresponds to a service in the CCC Taxonomy, with every threat linked to a specific feature and relevant threat models.

## Common vs. Specific Threats

To streamline maintenance, the CCC project maintains a list of [common threats].

Each service category’s `threats.yaml` file references these common threats by listing their IDs under the top-level `common_threats` value. During the release pipeline, our [Delivery Toolkit] compiles these common threats into the final document alongside any service-specific threats. In the final output, both types of threats are presented consistently, with the unique identifier being the only difference.

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

## Threat Definition Style

To maintain consistency, all threats—whether common or specific—must follow the same format, style, and tone. Each threat should adhere to the [threats template] before release.

### Definition of a Threat

According to **NIST SP 800-30 Rev. 1**, a threat is defined as:

> **"Any circumstance or event with the potential to adversely impact organizational operations (including mission, functions, image, or reputation), organizational assets, individuals, other organizations, or the Nation through an information system via unauthorized access, destruction, disclosure, modification of information, and/or denial of service."**

This definition emphasizes that a threat focuses on potential adverse impacts, not necessarily malicious intent.

### Neutral Approach to Threat Descriptions

#### Key Differences

| **Aspect**             | **Good Example**                                             | **Bad Example**                                           |
| ---------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| **Neutral Tone**       | Describes the condition neutrally.                           | Attributes the issue to an "attacker," assuming intent.   |
| **Focus on Condition** | Focuses on what went wrong and potential consequences.       | Assumes exploitation and focuses on malicious actions.    |
| **Objectivity**        | Leaves room for non-malicious scenarios (e.g., human error). | Frames the issue exclusively as a malicious exploitation. |

#### Examples

**Good Example**:
**Title**: Access Control is Misconfigured  
**Description**:
Misconfigured access controls may grant excessive privileges or fail to restrict unauthorized access to sensitive resources. This could result in unintended data exposure or unauthorized actions being performed within the system.

**Bad Example**:
**Title**: Access Control is Misconfigured  
**Description**:
An attacker can exploit misconfigured access controls to gain excessive privileges or unauthorized access to sensitive resources. This could lead to data breaches or malicious actions within the system.

### Best Practices

1. **Neutral Tone**: Describe threats in a neutral, objective manner without assuming malicious intent or attributing actions to an attacker.
2. **Focus on Conditions and Consequences**: Highlight the misconfiguration, condition, or situation that might result in an undesirable outcome, not the actor causing it.
3. **Avoid Redundancy**: Ensure that new threats are distinct from existing ones and do not overlap unnecessarily.
4. **Clarity and Precision**: Use clear language that conveys the nature and impact of the threat effectively to a broad audience.
5. **Consistent Formatting**: Follow the specified structure and guidelines for all entries to maintain uniformity.

### Threat Definition Values

When creating a new threat definition, use the following values:

- **Threat ID** (`id`): A unique identifier for the threat, following the format `<category-id>.TH<#>`.
- **Threat Title** (`title`): A short name or title using Title Case that succinctly describes the threat.
- **Threat Description** (`description`): A detailed description of the threat, including its nature and potential impact.
- **Feature IDs** (`capabilities`): A list of IDs for the corresponding CCC capabilities that this threat is associated with.
- **MITRE ATT&CK Technique** (`mitre_technique`): The unique identifier for the most relevant MITRE ATT&CK Technique.
- **Threat Models** (`threat_models`): URLs for any threat models used to develop this threat (omit if not applicable).

### Review Process

Although a review from the [Communications WG] is optional, it may be useful if additional support is needed to match the writing style or tone of the document.

This structure ensures that threats are standardized and can be consistently identified and addressed across all services within the CCC Taxonomy.

[common threats]: /services/shared-threats.yaml
[Communications WG]: ../../governance/working-groups/communications/charter.md
[Delivery Toolkit]: /delivery-toolkit
[threats template]: ../../resources/templates/threats.yaml
