# CCC Releases Pre-Build Script

This directory contains scripts for fetching CCC releases from GitHub before building the website.

## Scripts

### DownloadCCCReleases.ts

Fetches YAML files from GitHub releases and saves them to `src/data/ccc-releases/`.

#### Features

- Downloads all `.yaml` and `.yml` files from GitHub releases
- Supports GitHub token authentication for higher rate limits
- Creates output directory if it doesn't exist
- Provides detailed logging and error handling
- Exits with error code 1 on failure (useful for CI/CD)

#### Usage

```bash
# Run manually
npm run fetch:ccc

# Or run directly with ts-node
ts-node --compiler-options '{"module":"CommonJS"}' scripts/DownloadCCCReleases.ts
```

#### Environment Variables

- `GITHUB_TOKEN` (optional): GitHub personal access token for higher API rate limits

#### Integration

The script is automatically run as part of the build process:

- `npm run start` - Runs fetch:ccc before starting dev server
- `npm run build` - Runs fetch:ccc before building for production
- `npm run prebuild` - Runs fetch:ccc (can be called manually)

#### Output

YAML files are downloaded to `src/data/ccc-releases/` and can be used by the website's plugins and components.

## Troubleshooting

### Rate Limiting

If you encounter rate limiting errors:

1. Set a GitHub token: `export GITHUB_TOKEN=your_token_here`
2. Or wait for the rate limit to reset (1 hour for unauthenticated requests)

### Network Issues

- Check your internet connection
- Verify the GitHub API is accessible
- Ensure the repository exists and has releases

### File Permission Issues

- Ensure the script has write permissions to `src/data/ccc-releases/`
- Check that the parent directories exist and are writable
