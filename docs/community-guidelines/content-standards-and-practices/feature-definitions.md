# Feature Definitions

A feature definitions document provides a detailed specification of capabilities associated with a particular service category within the CCC Taxonomy. It serves as a reference to ensure that all relevant capabilities are properly documented and consistently defined across different services.

Each feature definition should be created for a service in the CCC Taxonomy, with each feature mapped to a specific aspect or functionality of that service.

## Common vs. Specific Capabilities

To streamline maintenance, the CCC project maintains a list of [common capabilities].

Each service category’s `capabilities.yaml` file references common capabilities by listing their IDs under the top-level `shared-capabilities` value. During the release pipeline, our [Delivery Toolkit] compiles these common capabilities into the final document alongside any specific capabilities. In the final output, both types of capabilities are presented consistently, with the unique identifier being the only difference.

### Common Capabilities

- Common capabilities are reusable across multiple service categories. They are documented once in the [common capabilities] file and referenced where applicable.
- These capabilities streamline the process by reducing redundancy and providing a consistent baseline across service categories.

### Specific Capabilities

- Specific capabilities are unique to a particular service category.
- If a feature is relevant to multiple categories, consider whether it should be generalized and added to the common capabilities list.

## Feature Documentation Process

When creating or updating a `capabilities.yaml` file for a service category, follow these steps:

1. **Review Common Capabilities**: Start by reviewing the [common capabilities] list. If any common capabilities apply to this category, reference them by adding their IDs to the `shared-capabilities` list.
2. **Define Specific Capabilities**: If a feature is unique to the service category, document it in the `specific-capabilities` section of the `capabilities.yaml` file.
3. **Consider Generalization**: If a specific feature could apply to at least three other service categories, evaluate whether it can be generalized and added to the [common capabilities] list.

## Feature Definition Format

To maintain consistency, all capabilities—whether common or specific—must follow the same format, style, and tone. Each feature should adhere to the [feature template](../../resources/templates/capabilities.yaml) before release.

### Feature Definition Values

When creating a new feature definition, use the following values:

- **Feature ID** (`id`): A unique identifier for the feature, following the format `CCC.<Service Category Abbreviation>.F<##>`.
- **Feature Title** (`title`): A short name that succinctly describes the feature, preferably 1 to 5 words.
- **Feature Description** (`description`): A falsifiable description of the feature, detailing its purpose and functionality.
  - A falsifiable feature includes concrete metrics, thresholds, or conditions that allow a user to verify whether the feature works as expected.

## Review Process

Although a review from the [Communications WG] is optional, it may be useful if additional support is needed to match the writing style or tone of the document.

[common capabilities]: /services/shared-capabilities.yaml
[Communications WG]: ../../governance/working-groups/communications/charter.md
[Delivery Toolkit]: /delivery-toolkit
