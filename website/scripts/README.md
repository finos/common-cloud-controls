# Website Scripts

This directory contains scripts for the Common Cloud Controls website.

## Scripts

### DownloadCCCReleases.ts

Downloads YAML assets from GitHub releases in the `finos/common-cloud-controls` repository.

**Usage:**

```bash
npm run fetch:ccc
```

**Requirements:**

- `GITHUB_TOKEN` environment variable (optional, for private repos)

**Output:**

- Downloads YAML files to `src/data/ccc-releases/`

### DownloadCFIArtifacts.ts

Downloads artifacts from CFI project GitHub Actions workflow runs.

**Usage:**

```bash
npm run fetch:cfi
```

**Requirements:**

- `GITHUB_TOKEN` environment variable (required for accessing GitHub Actions artifacts)
- `cfi-repositories.json` configuration file in `src/data/`

**Output:**

- Downloads artifacts to `src/data/cfi-configurations/{repository-name}/`

**Configuration:**
The script reads from `src/data/cfi-repositories.json` to determine which repositories to process:

```json
{
  "repositories": [
    {
      "name": "cfi-s3-module",
      "url": "https://github.com/robmoffat/cfi-s3-module",
      "description": "A module for creating a secure S3 bucket with encryption and logging enabled."
    }
  ]
}
```

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set GitHub token (for CFI artifacts):**

   ```bash
   export GITHUB_TOKEN=your_github_token_here
   ```

3. **Run scripts:**

   ```bash
   # Download CCC releases
   npm run fetch:ccc

   # Download CFI artifacts
   npm run fetch:cfi

   # Download both (runs before build)
   npm run prebuild
   ```

## Notes

- The `prebuild` script automatically runs both fetch scripts before building the website
- CFI artifacts are only downloaded from successful workflow runs
- Artifacts are filtered to only download those starting with `cfi-results-`
- Each repository gets its own subdirectory in the output
