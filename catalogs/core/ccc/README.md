# Core Reusable Catalog

This catalog is not intended for end user adoption, but rather acts as a central mechanism for all other catalogs to reference. By maintaining this as a standalone version-controlled catalog, we can increase clarity as to the source of the controls when elements from this directory are brought in as shared entries to service-specific catalogs.

This catalog may be imported to other catalogs by adding the catalog data in a mapping reference entry, then targeting the relevant elements each by ID.

## Add this catalog to your metadata

In your control catalog's metadata, simply add a new block within `mapping-references`.

Here's an example of what that would look like:

```yaml
metadata:
  id: NewSvc
  title: Some New Cloud Service Category
  version: ""
  description: ""
  last-modified: ""
  mapping-references:
    - id: CCC
      title: Common Cloud Controls Core
      version: v2025.08
      url: https://github.com/finos/common-cloud-controls/releases/tag/v2025.09.Core
      description: ""
```

## Reuse a capability from this catalog

Simply add a block like the one below at the top level of your catalog's YAML, parallel to the metadata object.
This block will list every imported capability by the ID, directing parsers to pull the rest of the data from the mapping reference that you provided in the Metadata.

```yaml
imported-capabilities:
  - reference-id: CCC
    identifiers:
      - CCC.Core.F01 # Encryption in Transit Enabled by Default
      - CCC.Core.F02 # Encryption at Rest Enabled by Default
      - CCC.Core.F03 # Access/Activity Logs
```

> [!NOTE]
>
> The comment is a development style decision, and does not get rendered in the final output.

## Reuse a threat from this catalog

Similar to capabilities, add a block like the following to the top level of your catalog's YAML:

```yaml
imported-threats:
  - reference-id: CCC
    identifiers:
      - CCC.TH01 # Access Control is Misconfigured
      - CCC.TH02 # Data is Intercepted in Transit
      - CCC.TH03 # Deployment Region Network is Untrusted
```

## Reuse a control from this catalog

Similar to capabilities, add a block like the following to the top level of your catalog's YAML:

```yaml
imported-controls:
  - reference-id: CCC
    identifiers:
      - CCC.Core.C01 # Prevent Unencrypted Requests
      - CCC.Core.C02 # Ensure Data Encryption at Rest for All Stored Data
      - CCC.Core.C03 # Implement Multi-factor Authentication (MFA) for Access
```
