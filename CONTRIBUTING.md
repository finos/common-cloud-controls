# Contributors Guide

## Overview

This file holds general documentation relevant to contributing to the Common Cloud Controls project such as [project structure](#project-structure) and [VSCode](#vscode-1) information. For more specific documentation on contributing to the GitHub repository please see the [GitHub specific documentation](/.github/CONTRIBUTING.md). This is a working document and as such if you feel there is information missing please highlight it using the [issue section of the GitHub repository](https://github.com/finos/common-cloud-controls/issues).

## Project structure

This section provides a high-level overview of the project structure.

### Top level

- [.gitignore](https://git-scm.com/docs/gitignore): Standard ignore file for exclusion of files from source control.
- [.gitvote.yml](https://github.com/cncf/gitvote): config file for GitVote.
- [.prettierignore](https://prettier.io/): paths to exclude from prettier checks.
- [Governance.md](/Governance.md):

### .config

The [`.config`](/.config) directory contains config for various tooling used in the project, e.g. [prettier](https://prettier.io/) and [markdownlint](https://github.com/DavidAnson/markdownlint).

### .github

The [`.github`](/.github) directory contains documents relevant specifically to github. These include the [CODEOWNERS](/.github/CODEOWNERS) file, documentation on [contributing](/.github/CONTRIBUTING.md) to the repository, [workflow](https://docs.github.com/en/actions/writing-workflows/about-workflows) definitions and [issue templates](/.github/ISSUE_TEMPLATE) for various common [github issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/about-issues) such as meeting minutes.

### .vscode

The [`.vscode`](/.vscode) directory contains files and configuration specific to the [vscode](https://code.visualstudio.com/docs/getstarted/settings) text editor. These include, settings, extensions and [snippet definitions](#snippets).

### Delivery Tooling

The [`delivery-tooling`](/delivery-tooling/) directory contains a selection of [`.go`](https://go.dev/) tooling and markdown files for use with creating a release.

### Documentation

The [`docs`](/docs/) directory is a centralised store for all documentation related to the project (excluding the top-level [README](/README.md) file). It contains information on the community guidelines, community policies, detailed information on governance, including the various [working groups](/docs/governance/working-groups/). The documentation directory also contains information on various reusable [resources](/docs/resources/readme.md) utilised in the project.

### Schemas

The [`schemas`](/schemas) directory contains the yaml validation schemas used in the project. Yaml validation schemas have been created for controls, features, metadata and threats files, to ensure that contributions follow the approved structure and contain required values.

### Services

The [`services`](/services/) directory is the main working directory of the project. It contains a list of common cloud services organised in a hierarchical way from high level resource type first becoming more granular. For example:

```ascii
services/
└── database/
    └── relational/
    └── warehouse/
```

Each resource should contain the following files in `.yaml` format:

- `controls.yaml`: The common compliance controls for the resource.
- `features.yaml`: The common features which define the resource.
- `threats.yaml`: The security threats related to the resource.
- `metadata.yaml`: Metadata on the resource such as resource details.

The resource should also contain a `tests` directory containing details on how to test the resource is compliant.

The top level of the `services` directory contains `yaml` files for common controls, features and threats which are common to multiple resources. It also contains the [`service-families.yaml`](/services/service-families.yaml) file which documents the service families and their descriptions.

## VSCode

### Snippets

[VSCode snippets](https://code.visualstudio.com/docs/editor/userdefinedsnippets) are defined for common [features](.vscode/common-features.code-snippets), [threats](.vscode/common-threats.code-snippets) and [controls](.vscode/common-controls.code-snippets).
To make use of these snippets start typing the snippet prefix in any `yaml` file and VSCode will offer you the option to auto-complete the snippet e.g.

```yaml
CF3
```

![snippet](/docs/resources/snippet.gif)

#### Snippet overview

| Snippet           | Description                            | File                                                                   | Prompt     |
| ----------------- | -------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| Threats File      | Create a blank FINOS CCC Threats file  | [threats.code-snippets](.vscode/threats.code-snippets)                 | `th`, `fi` |
| Threat            | Create a blank FINOS CCC Threat        | [threats.code-snippets](.vscode/threats.code-snippets)                 | `th`, `fi` |
| Common Threats\*  | Create a common FINOS CCC Threat       | [common-threats.code-snippets](.vscode/common-threats.code-snippets)   | `CT`       |
| Feature File      | Create a blank FINOS CCC Feature file  | [features.code-snippets](.vscode/features.code-snippets)               | `fe`, `fi` |
| Feature           | Create a blank FINOS CCC Feature       | [features.code-snippets](.vscode/features.code-snippets)               | `fe`, `fi` |
| Common Features\* | Create a common FINOS CCC Feature      | [common-features.code-snippets](.vscode/common-features.code-snippets) | `CF`       |
| Controls File     | Create a blank FINOS CCC Controls file | [controls.code-snippets](.vscode/controls.code-snippets)               | `co`, `fi` |
| Control           | Create a blank FINOS CCC Control       | [controls.code-snippets](.vscode/controls.code-snippets)               | `co`, `fi` |
| Common Controls\* | Create a common FINOS CCC Control      | [common-controls.code-snippets](.vscode/common-controls.code-snippets) | `CT`       |
| Metadata File     | Create a blank FINOS CCC Metadata file | [metadata.code-snippets](.vscode/metadata.code-snippets)               | `me`, `fi` |

### YAML Schema validation

By default, the contents of `.vscode/settings.json` should automatically be considered by Visual Studio Code. In-line suggestions should appear in the event that your file is not compatible with the corresponding schema.

If this does not satisfy your use case for some reason, you can update your global VSCode settings to highlight issues using the schema files with the following steps:

1. Install VSCode [Red Hat YAML extension](https://github.com/redhat-developer/vscode-yaml)
2. Under VSCode `settings.json` add the following (or your local equivalent):

   ```json
       "yaml.schemas": {
           "file:///<PATH_TO_CCC_REPO>/common-cloud-controls/schemas/controls-schema.json": "controls.yaml",
           "file:///<PATH_TO_CCC_REPO>/common-cloud-controls/schemas/features-schema.json": "features.yaml",
           "file:///<PATH_TO_CCC_REPO>/common-cloud-controls/schemas/metadata-schema.json": "metadata.yaml",
           "file:///<PATH_TO_CCC_REPO>/common-cloud-controls/schemas/threats-schema.json": "threats.yaml"
       }
   ```

3. Save these settings and reload VSCode.

![yaml](/docs/resources/yaml-validate.gif)
