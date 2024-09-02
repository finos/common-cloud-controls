# Threat Definitions

A threat definitions document is a detailed specification of potential security threats associated with a particular service category within the CCC Taxonomy. It serves as a reference to identify and describe various threats, ensuring they are consistently documented and mapped to relevant features and threat models.

Each threat definition should be created for a service in the CCC Taxonomy, with each threat mapped to a specific feature and linked to relevant threat models.

## Common vs Specific Threats

In order to streamline maintenance, the CCC project maintains a list of [common threats].

In each service category's `threats.yaml` document, common threats are referenced in a list of IDs in the top-level value `common-threats`.

In the release pipeline, our [delivery tooling] will compile the common threats into the document alongside the specific threats. In the final output, the only difference in presentation of the threats will be the unique identifier.

## Threat Definition Format

In order to create a cohesive standard that is readily useful to end users, threats must be indistinguishable from each other in format, style, and tone. As such, all threats must match the layout presented in the [threats template] prior to release.

A review from the [Communications WG] is recommended, but not required, in cases where additional support is needed to match the writing style and tone.

[!NOTE] The list of common threats follows a similar but unique format, which can be found in the [common threats] file.

### Common Threat References

When documenting threats for a service category, begin by reviewing the existing [common threats]. In the event that a common threat applies to this category, you may reference it from your document by adding its ID to the list `common-threats` at the top level of the threats document.

In the event that a common entry does not exist for this threat, consider whether the threat will apply to at least three other service categories. Or, look for a place where an existing _specific threat_ can be genericized and moved to the _common threats_. After adding the new threat definition to [common threats], add its ID in `common-threats`.

If a threat is unique to this service category, add the full threat definition within the `specific-threats` value in the threats document for this service category.

### Threat Definition Values

The following list outlines the values necessary to create a new threat definition using the threat template. Refer to the feature definition for the `Service Category` name and abbreviation.

- **Category Title** - The title of the service category this threat belongs to, formatted as `CCC <Service Category> Security Threats`.
- **Category ID** - A unique identifier for the service category, following the format `CCC.<Service Category Abbreviation>`. 
- **Threat ID** - A unique identifier for the threat, following the format `<category-id>.TH<#>`.
- **Threat Title** - A short name or title that succinctly describes the threat.
- **Threat Description** - A complete description of the threat, detailing its nature and potential impact.
- **Feature ID** - The corresponding feature ID that this threat is associated with.
- **MITRE ATT&CK** - A list of MITRE ATT&CK tactic and technique IDs relevant to the threat.
- **Threat Models** - URLs to the threat models used to form this threat; omit this if not applicable.

[common threats]: /services/common-threats.yaml
[Communications WG]: ../../working-groups/communications/charter.md
[delivery tooling]: /delivery-tooling
[threats template]: ../templates/threats.yaml
