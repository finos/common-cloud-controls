# CFI compliance testing

This module runs [Privateer](https://github.com/privateerproj/privateer) behavioural tests. These assert a live cloud deployment against CCC control requirements.

## Running locally

### 1. Clone the repo

```bash
git clone https://github.com/finos/common-cloud-controls.git
cd common-cloud-controls
```

You also need:

- **Go 1.24+** — builds the behavioural plugin and supporting modules (`modules/go.work` pins the version CI uses).
- **Privateer CLI** — install with `go install github.com/privateerproj/privateer/cmd/pvtr@latest` and ensure `pvtr` is on your `PATH`.
- **Cloud CLI and credentials** — `az` for Azure, `aws` for AWS, or `gcloud` for GCP, with an authenticated session before provisioning test principals.

### 2. Create a Privateer configuration

Privateer configs live under [`privateer-config/`](privateer-config/). Each YAML file defines one or more `services` entries that point at the `ccc-behavioural-plugin` and declare which CCC catalogs to evaluate.

A minimal service block looks like this:

```yaml
services:
  azureStorageBehavioural:
    plugin: ccc-behavioural-plugin
    policy:
      catalogs:
        - CCC.ObjStor
    vars:
      service: object-storage
      provider: azure
      catalog-versions:
        CCC.Core: v2025.10
        CCC.ObjStor: DEV
      resource: "finos-ccc-integration-container-main"
      azure-subscription-id: "${AZURE_SUBSCRIPTION_ID}"
      azure-tenant-id: "${AZURE_TENANT_ID}"
```

Key fields:

| Field | Purpose |
|-------|---------|
| `policy.catalogs` | CCC catalog IDs whose controls are in scope |
| `vars.catalog-versions` | Version of each catalog — usually `DEV` for local work, or a published release such as `v2025.10` for `CCC.Core` |
| `vars.service` / `vars.provider` | Selects the Godog step definitions and cloud API client |
| `vars.resource` | Primary resource under test (name or ID, depending on service) |
| Remaining `vars` | Service-specific fixture coordinates (VPC IDs, storage account names, identity blocks, etc.) |

Start from an existing config that matches your module and cloud:

- [`privateer-config/finos-integration/`](privateer-config/finos-integration/) — FinOS integration Terraform fixtures
- [`privateer-config/avm/`](privateer-config/avm/) — Azure Verified Modules

### 3. Environment variables in Privateer config files

Config values can reference shell environment variables with `${VAR}` syntax. Before running tests, export the variables your config expects.

For an example of this used by CCC integration testing, take a look at [`modules/cloud-api-test/environment-config/`](../modules/cloud-api-test/environment-config/):

Hard-coded resource identifiers in the config (VPC IDs, storage account names, etc.) must match the Terraform outputs from the fixture you applied. Update those literals after `terraform apply` when provisioning a new environment.

In CI, the same variables are injected from GitHub Actions secrets (see [Configuring GitHub Actions](#configuring-github-actions) below).

### 4. Generating DEV catalogs

Privateer requires CCC catalogs in order to report Gemara results.   You can download the catalogs from the [CCC GitHub Releases page](https://github.com/finos/common-cloud-controls/releases), [grc.store](https://grc.store) or generate development versions locally (as in the above example). 

To generate locally, from the repository root run:

```bash
npm ci --prefix website
npm run generate:catalogs --prefix website
```

This writes files such as `CCC.ObjStor_DEV-controls.yaml` into [`website/src/data/ccc-releases/`](../website/src/data/ccc-releases/). The test runner syncs the relevant controls into the plugin before each run. If a DEV catalog is missing, the runner will fail with a message pointing at this command.

Published release artifacts (e.g. `CCC.Core_v2025.10-controls.yaml`) may already be present in that directory; `generate:catalogs` adds the DEV builds alongside them.

### 5. Running the test

From the repository root, invoke [`run-compliance-tests.sh`](run-compliance-tests.sh).  For example:

```bash
# AWS VPC (good fixture):
source modules/cloud-api-test/environment-config/aws-env.sh
./cfi-testing/run-compliance-tests.sh \
  -c privateer-config/finos-integration/vpc/aws-vpc-good.yml \
  -S awsVpcGood \
  -s vpc \
  -g '@Behavioural'
```

Paths passed to `-c` are relative to `cfi-testing/`; the script resolves them automatically.

| Flag | Description |
|------|-------------|
| `-c` | Privateer config YAML |
| `-S` | Service key in that config (required) |
| `-s` | Godog service type (default: `object-storage`) |
| `-g` | Cucumber tag filter (e.g. `@Behavioural`) |
| `-o` | Report output directory |
| `-r` | Filter to a specific resource name |
| `-t` | Timeout (default: `30m`) |
| `--debug` | Run plugin in-process (no `pvtr`) |
| `--skip-build` | Skip Go module build |
| `-h` | Help |

The script builds `ccc-behavioural-plugin`, registers it with Privateer, syncs catalogs, and runs `pvtr run`. Use `--debug` during plugin development to skip the Privateer host and run the plugin directly.

### 6. Reviewing the results

By default, Privateer writes YAML evaluation output to the directory named in the config's `write-directory` field (`evaluation_results/` relative to where the runner executes). Pass `-o` to override.

## Running Tests inside CCC's GitHub Actions

You can run these tests and publish results on the [CCC website](https://ccc.finos.org). 

### 0. Create a Privateer config 

As described above - create a privateer configuration file that you have tested locally.  Do not include secrets or other sensitive information in the file, use the environment variable replacement approach as described in step 3 above.  

### 1. Create an `actions-config` file

Add a YAML file under [`actions-config/`](actions-config/). The CCC GitHub actions workflow discovers every `*.yaml` in that directory and runs one matrix job per file.

Example ([`actions-config/azure-storage-finos.yaml`](actions-config/azure-storage-finos.yaml)):

```yaml
cfi:
  id: azure-storage-account
  artifact-name: finos-integration-azure-storage-account
  provider: azure
  source-secrets: AZURE_ENV
  service: object-storage
  name: CCC Azure Storage Account Terraform Module
  description: >-
    This module creates a secure Azure Storage Account with encryption, networking,
    monitoring, and advanced security features.
  path: https://github.com/finos-labs/ccc-cfi-compliance/tree/main/remote/azure/storageaccount
  test-on-branches:
    - main
  git: https://github.com/Azure/terraform-azurerm-avm-res-storage-storageaccount
  test-configuration: ../privateer-config/finos-integration/cloud-storage/azure-cloud-storage.yml
  privateer-service: azureStorageBehavioural
```

| Field | Purpose |
|-------|---------|
| `id` | Stable identifier; used for output paths (`cfi-testing/output/<id>/`) |
| `artifact-name` | GitHub Actions artifact name uploaded after the run |
| `provider` | `aws`, `azure`, or `gcp` — selects the OIDC auth step |
| `source-secrets` | Name of a GitHub Actions secret containing a multiline `export` env block (same shape as `*-env.sh`) |
| `service` | Godog service type passed to `-s` |
| `test-configuration` | Path to the Privateer config, relative to the actions-config file |
| `privateer-service` | Service key passed to `-S` |
| `path` / `git` / `name` / `description` | Metadata surfaced on the CCC website |

### 2. Load Secrets into Common Cloud Controls

If your configuration requires specific secrets, load them into Github secrets for the [CCC Repository](https://github.com/finos/common-cloud-controls).  The name of the secret must match the one in `source-secrets`.  

### 3. Observe the results

Once your configuration has run, an artifact containing the test results will be produced with the given `artifact-name`. You can download it from the GitHub Actions run page, or continue to step 4 to render it through the CCC website.

### 4. Building the CCC website locally and reviewing the results

The [CCC website](https://ccc.finos.org) is a Docusaurus site in [`website/`](../website/). Its CFI pages read test output from `website/src/data/test-results/` and render pass/fail summaries, control mappings, and downloadable reports.

#### Register your repository

Before the site can find your results, add (or update) a row in [`website/src/data/cfi-repositories.json`](../website/src/data/cfi-repositories.json):

```json
{
  "repositories": [
    {
      "name": "common-cloud-controls-integration",
      "url": "https://github.com/finos/common-cloud-controls",
      "description": "FINOS Common Cloud Controls Integration Tests",
      "destination": "finos-common-cloud-controls",
      "workflow": "cfi-test.yml",
      "branches": ["main"],
      "artifact-filter": "finos-integration-*"
    }
  ]
}
```

| Field | Purpose |
|-------|---------|
| `name` | Display name and config directory key |
| `url` | GitHub repository to pull artifacts from |
| `destination` | Folder name under `website/src/data/test-results/` |
| `workflow` | Workflow file name under `.github/workflows/` |
| `branches` | Optional allow-list; omit to check all remote branches |
| `artifact-filter` | Glob matched against artifact names (supports `*`) |

The `artifact-name` in your actions-config must match this filter (e.g. `finos-integration-azure-storage-account` matches `finos-integration-*`).

When adding a new repository or artifact naming scheme, update both an `actions-config` entry (for CI) and a row in `cfi-repositories.json` (for the website).

#### Fetch results from GitHub Actions and start the site on localhost

From the repository root:

```bash
export GITHUB_TOKEN=<personal-access-token with actions:read>
npm ci --prefix website
npm run fetch:cfi --prefix website
npm start --prefix website
```

`GITHUB_TOKEN` is required — unauthenticated requests cannot download workflow artifacts. If the token is unset, `fetch:cfi` skips the download with a warning.

Open [http://localhost:3000/cfi](http://localhost:3000/cfi) to browse your results.

### 5.  Publishing the results on [ccc.finos.org](https://ccc.finos.org)

Create a PR containing your changes to `cfi-repositories.json` if you made any.   The CCC website updates either when the PR is merged or daily to show new runs.  