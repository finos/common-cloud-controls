# Feature Definitions

A feature definitions document provides a detailed specification of features associated with a particular service category within the CCC Taxonomy. It serves as a reference to ensure that all relevant features are properly documented and consistently defined across different services.

Each feature definition should be created for a service in the CCC Taxonomy, with each feature mapped to a specific aspect or functionality of that service.

## Common vs. Specific Features

To streamline maintenance, the CCC project maintains a list of [common features].

Each service category’s `features.yaml` file references common features by listing their IDs under the top-level `common_features` value. During the release pipeline, our [delivery tooling] compiles these common features into the final document alongside any specific features. In the final output, both types of features are presented consistently, with the unique identifier being the only difference.

### Common Features

- Common features are reusable across multiple service categories. They are documented once in the [common features] file and referenced where applicable.
- These features streamline the process by reducing redundancy and providing a consistent baseline across service categories.

### Specific Features

- Specific features are unique to a particular service category.
- If a feature is relevant to multiple categories, consider whether it should be generalized and added to the common features list.

## Feature Documentation Process

When creating or updating a `features.yaml` file for a service category, follow these steps:

1. **Review Common Features**: Start by reviewing the [common features] list. If any common features apply to this category, reference them by adding their IDs to the `common_features` list.
2. **Define Specific Features**: If a feature is unique to the service category, document it in the `specific-features` section of the `features.yaml` file.
3. **Consider Generalization**: If a specific feature could apply to at least three other service categories, evaluate whether it can be generalized and added to the [common features] list.

## Feature Definition Format

To maintain consistency, all features—whether common or specific—must follow the same format, style, and tone. Each feature should adhere to the [feature template](../templates/features.yaml) before release.

### Feature Definition Values

When creating a new feature definition, use the following values:

- **Feature ID** (`id`): A unique identifier for the feature, following the format `CCC.<Service Category Abbreviation>.F<##>`.
- **Feature Title** (`title`): A short name that succinctly describes the feature, preferably 1 to 5 words.
- **Feature Description** (`description`): A falsifiable description of the feature, detailing its purpose and functionality.
  - A falsifiable feature includes concrete metrics, thresholds, or conditions that allow a user to verify whether the feature works as expected.

## Review Process

Although a review from the Communications WG is optional, it may be useful if additional support is needed to match the writing style or tone of the document.

[common features]: /services/common-features.yaml
[Communications WG]: ../../working-groups/communications/charter.md
[delivery tooling]: /delivery-tooling
[threats template]: ../templates/threats.yaml
