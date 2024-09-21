# Yaml Validation Schemas

Yaml validation schemas have been created for controls, features, metadata and threats files.

## VSCode integration

You can update VSCode to highlight issues using the schema files with the following steps:

1. Install VSCode [Red Hat YAML extension](https://github.com/redhat-developer/vscode-yaml)
2. Under VSCode `settings.json` add the following:

   ```json
       "yaml.schemas": {
           "file:///<PATH_TO_CCC_REPO>/common-cloud-controls/docs/governance/community-guidelines/templates/schemas/controls-schema.json": "controls.yaml",
           "file:///<PATH_TO_CCC_REPO>/common-cloud-controls/docs/governance/community-guidelines/templates/schemas/features-schema.json": "features.yaml",
           "file:///<PATH_TO_CCC_REPO>/common-cloud-controls/docs/governance/community-guidelines/templates/schemas/metadata-schema.json": "metadata.yaml",
           "file:///<PATH_TO_CCC_REPO>/common-cloud-controls/docs/governance/community-guidelines/templates/schemas/threats-schema.json": "threats.yaml"
       }
   ```

3. Save these settings and reload VSCode.