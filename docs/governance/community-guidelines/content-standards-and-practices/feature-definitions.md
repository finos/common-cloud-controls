# Feature Definitions

A feature definitions document provides a detailed specification of features associated with a particular service category within the CCC Taxonomy. It serves as a reference to ensure that all relevant features are properly documented and consistently defined across different services.

Each feature definition should be created for a service in the CCC Taxonomy, with each feature mapped to a specific aspect or functionality of that service.

## Feature Definition Format

In order to create a cohesive standard that is readily useful to end users, features must be indistinguishable from each other in format, style, and tone. A review from the [Communications WG] is recommended, but not required, in cases where additional support is needed to match the writing style and tone.

As such, all features must match the layout presented in the [feature template](../templates/features.yaml) prior to release.

The following list outlines the values necessary to create a new feature definition using the feature template:

- **Category Title** - The title of the service category this feature belongs to, formatted as `CCC <Service Category> Security Threats`.
- **Category ID** - A unique identifier for the service category, following the format `CCC.<Service Category Abbreviation>`.
- **Type** - The parent type of the service category.
- **Category Description** - A 1 to 3 sentence description of the service category.
- **Service Examples** - Names of known cloud services that fall under this category.
- **Feature ID** - A unique identifier for the feature, following the format `CCC.<Service Category Abbreviation>.F<##>`.
- **Feature Title** - A short name or title that succinctly describes the feature.
- **Feature Description** - A complete description of the feature, detailing its purpose and functionality.

This structure ensures that features are standardized and can be consistently applied across all services within the CCC Taxonomy.

[Communications WG]: ../../working-groups/communications/charter.md
