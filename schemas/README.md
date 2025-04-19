# Yaml Validation Schemas

Yaml validation schemas have been created for controls, capabilities, metadata and threats files, to ensure that contributions follow the approved structure and contain required values.

## VSCode integration

By default, the contents of `.vscode/settings.json` should automatically be considered by Visual Studio Code. In-line suggestions should appear in the event that your file is not compatible with the corresponding schema.

If this does not satisfy your use case for some reason, you can update your global VSCode settings to highlight issues using the schema files with the following steps:

1. Install VSCode [Red Hat YAML extension](https://github.com/redhat-developer/vscode-yaml)
2. Under VSCode `settings.json` add the following (or your local equivalent):

   ```json
       "yaml.schemas": {
           "file:///<PATH_TO_CCC_REPO>/common-cloud-controls/schemas/controls-schema.json": "controls.yaml",
           "file:///<PATH_TO_CCC_REPO>/common-cloud-controls/schemas/capabilities-schema.json": "capabilities.yaml",
           "file:///<PATH_TO_CCC_REPO>/common-cloud-controls/schemas/metadata-schema.json": "metadata.yaml",
           "file:///<PATH_TO_CCC_REPO>/common-cloud-controls/schemas/threats-schema.json": "threats.yaml"
       }
   ```

3. Save these settings and reload VSCode.
