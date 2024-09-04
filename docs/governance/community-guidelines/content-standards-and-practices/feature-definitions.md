# Feature Definitions

A feature definitions document provides a detailed specification of features associated with a particular service category within the CCC Taxonomy. It serves as a reference to ensure that all relevant features are properly documented and consistently defined across different services.

Each feature definition should be created for a service in the CCC Taxonomy, with each feature mapped to a specific aspect or functionality of that service.

## Common vs Specific Features

In order to streamline maintenance, the CCC project maintains a list of [common features].

In each service category's `features.yaml` document, common features are referenced in a list of IDs in the top-level value `common-features`.

In the release pipeline, our [delivery tooling] will compile the common features into the document alongside the specific features. In the final output, the only difference in presentation of the features will be the unique identifier.

## Feature Definition Format

In order to create a cohesive standard that is readily useful to end users, features must be indistinguishable from each other in format, style, and tone. As such, all features must match the layout presented in the [feature template](../templates/features.yaml) prior to release.

A review from the [Communications WG] is recommended, but not required, in cases where additional support is needed to match the writing style and tone.

[!NOTE] The list of common features follows a similar but unique format, which can be found in the [common features] file.

### Common Feature References

When documenting features for a service category, begin by reviewing the existing [common features]. In the event that a common feature applies to this category, you may reference it from your document by adding its ID to the list `common-features` at the top level of the features document.

In the event that a common entry does not exist for this feature, consider whether the feature will apply to at least three other service categories. Or, look for a place where an existing _specific feature_ can be genericized and moved to the _common features_. After adding the new feature definition to [common features], add its ID in `common-features`.

If a feature is unique to this service category, add the full feature definition within the `specific-features` value in the features document for this service category.

### Feature Definition Values

The following list outlines the values necessary to create a new feature definition using the feature template. When defining a new `Service Category` for the first time, be sure to use a unique abbreviation that is a maximum of 8 characters.

- **Category Title** - The title of the service category this feature belongs to, formatted as `CCC <Service Category> Minimum Features`.
- **Category ID** - A unique identifier for the service category, following the format `CCC.<Service Category Abbreviation>`.
- **Type** - The parent type of the service category.
- **Category Description** - A 1 to 3 sentence description of the service category.
- **Service Examples** - Names of known cloud services that fall under this category.
- **Feature ID** - A unique identifier for the feature, following the format `CCC.<Service Category Abbreviation>.F<##>`.
- **Feature Title** - A short name that succinctly describes the feature.
- **Feature Description** - A falsifiable description of the feature, detailing its purpose and functionality.
  - A falsifiable feature should include concrete metrics, thresholds, or conditions that allow a user to verify whether the feature works as expected or not.
This structure ensures that features are standardized and can be consistently applied across all services within the CCC Taxonomy.

[Communications WG]: ../../working-groups/communications/charter.md
