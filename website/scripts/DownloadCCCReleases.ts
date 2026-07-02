import fs from 'fs';
import path from 'path';
import axios from 'axios';
import yaml from 'js-yaml';

const REPO_ROOT = path.join(__dirname, '../..');
const CATALOGS_DIR = path.join(REPO_ROOT, 'catalogs');
const OUTPUT_DIR = path.join(__dirname, '../src/data/ccc-releases');
const GITHUB_API = 'https://api.github.com/repos/finos/common-cloud-controls/releases';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const IGNORE_LIST_PATH = path.join(__dirname, 'ignorelist.txt');

/** Matches release.yml tags: <family>/<service>/<version> e.g. storage/object/v2026.06-rc1 */
const RELEASE_TAG = /^(?<buildTarget>[a-z0-9-]+\/[a-z0-9-]+)\/(?<version>v.+)$/;

/** Website bundle file names produced by assembleWebsiteCatalog.ts */
const TYPED_RELEASE_FILE =
    /^(?<catalogId>CCC\.[A-Za-z0-9.]+)_(?<version>.+)-(?<assetType>metadata|capabilities|controls|threats|release-details)\.yaml$/;

const TYPED_ASSET_NAMES = new Set(['capabilities.yaml', 'threats.yaml', 'controls.yaml']);

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

interface ReleaseAsset {
    name: string;
    browser_download_url: string;
}

interface GitHubRelease {
    tag_name: string;
    prerelease: boolean;
    assets: ReleaseAsset[];
}

function githubHeaders(): Record<string, string> {
    return GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {};
}

function outputFileName(metadataId: string, version: string, suffix: string): string {
    return `${metadataId}_${version}-${suffix}.yaml`;
}

function loadIgnoreList(): string[] {
    try {
        if (!fs.existsSync(IGNORE_LIST_PATH)) {
            return [];
        }

        const content = fs.readFileSync(IGNORE_LIST_PATH, 'utf8');
        const ignorePatterns = content
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#'));

        if (ignorePatterns.length > 0) {
            console.log(`📝 Loaded ${ignorePatterns.length} ignore patterns: ${ignorePatterns.join(', ')}`);
        }

        return ignorePatterns;
    } catch (error) {
        console.log(`⚠️  Failed to load ignore list: ${error instanceof Error ? error.message : String(error)}`);
        return [];
    }
}

function shouldIgnoreCatalog(catalogId: string, version: string, ignorePatterns: string[]): boolean {
    const prefix = `${catalogId}_${version}`;
    return ignorePatterns.some((pattern) => catalogId.includes(pattern) || prefix.includes(pattern));
}

function loadMetadataId(buildTarget: string): string | null {
    const metadataPath = path.join(CATALOGS_DIR, buildTarget, 'metadata.yaml');
    if (!fs.existsSync(metadataPath)) {
        console.warn(`⚠️  No metadata.yaml for build target ${buildTarget}`);
        return null;
    }

    const doc = yaml.load(fs.readFileSync(metadataPath, 'utf8')) as { metadata?: { id?: string } };
    const id = doc?.metadata?.id?.trim();
    if (!id) {
        console.warn(`⚠️  metadata.id missing in catalogs/${buildTarget}/metadata.yaml`);
        return null;
    }
    return id;
}

function writeMetadataFile(catalogPath: string, metadataId: string, version: string): void {
    const metadata = yaml.load(fs.readFileSync(path.join(catalogPath, 'metadata.yaml'), 'utf8')) as {
        metadata?: Record<string, unknown>;
    };
    if (!metadata?.metadata) {
        throw new Error(`metadata.yaml missing or invalid for ${metadataId}`);
    }

    const metaBlock = {
        ...metadata.metadata,
        version,
        'last-modified': new Date().toISOString(),
    };
    const dest = path.join(OUTPUT_DIR, outputFileName(metadataId, version, 'metadata'));
    fs.writeFileSync(
        dest,
        yaml.dump({ metadata: metaBlock }, { lineWidth: -1, noRefs: true, sortKeys: false }),
        'utf8'
    );
}

function writeReleaseDetailsFile(metadataId: string, version: string): void {
    const dest = path.join(OUTPUT_DIR, outputFileName(metadataId, version, 'release-details'));
    const body = yaml.dump(
        [
            {
                version,
                'assurance-level': '',
                'threat-model-url': '',
                'threat-model-author': '',
                'red-team': '',
                'red-team-exercise-url': '',
                'release-manager': {
                    name: 'FINOS Common Cloud Controls',
                    'github-id': '',
                    company: 'FINOS',
                    quote: '',
                },
                'change-log': [`Release ${version} published via release.yml`],
                contributors: [],
            },
        ],
        { lineWidth: -1, noRefs: true, sortKeys: false }
    );
    fs.writeFileSync(dest, body, 'utf8');
}

async function fetchAllReleases(): Promise<GitHubRelease[]> {
    const headers = githubHeaders();
    const releases: GitHubRelease[] = [];
    let page = 1;

    while (true) {
        const response = await axios.get<GitHubRelease[]>(GITHUB_API, {
            headers,
            params: { per_page: 100, page },
        });
        releases.push(...response.data);
        if (response.data.length < 100) {
            break;
        }
        page++;
    }

    return releases;
}

async function downloadAsset(asset: ReleaseAsset, destPath: string, headers: Record<string, string>): Promise<void> {
    const download = await axios.get(asset.browser_download_url, {
        responseType: 'stream',
        headers,
    });

    const writer = fs.createWriteStream(destPath);
    await new Promise<void>((resolve, reject) => {
        download.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function downloadYamlAssets(): Promise<void> {
    const headers = githubHeaders();
    const ignorePatterns = loadIgnoreList();
    const versionFilter = process.env.RELEASE_VERSION?.trim();

    console.log('📦 Fetching releases from GitHub (including prereleases)...');
    if (versionFilter) {
        console.log(`🔎 Filtering to version: ${versionFilter}`);
    }

    const releases = await fetchAllReleases();
    console.log(`📋 Found ${releases.length} GitHub releases`);

    let totalDownloaded = 0;
    let skippedReleases = 0;
    let ignoredCatalogs = 0;
    let legacyDownloaded = 0;

    for (const release of releases) {
        const tag = release.tag_name;
        const tagMatch = tag.match(RELEASE_TAG);

        if (tagMatch?.groups) {
            const { buildTarget, version } = tagMatch.groups;
            if (versionFilter && version !== versionFilter) {
                continue;
            }

            const metadataId = loadMetadataId(buildTarget);
            if (!metadataId) {
                skippedReleases++;
                continue;
            }

            if (shouldIgnoreCatalog(metadataId, version, ignorePatterns)) {
                console.log(`🚫 Ignoring ${metadataId} ${version} — matches ignore pattern`);
                ignoredCatalogs++;
                continue;
            }

            const typedAssets = release.assets.filter((asset) => TYPED_ASSET_NAMES.has(asset.name));
            if (typedAssets.length === 0) {
                console.log(`⏭️  Skipping ${tag} — no capabilities/threats/controls.yaml assets`);
                skippedReleases++;
                continue;
            }

            const prereleaseNote = release.prerelease ? ' (prerelease)' : '';
            console.log(`\n📦 Processing ${tag}${prereleaseNote} → ${metadataId}`);

            for (const asset of typedAssets) {
                const assetType = asset.name.replace(/\.yaml$/, '');
                const destName = outputFileName(metadataId, version, assetType);
                const destPath = path.join(OUTPUT_DIR, destName);
                console.log(`⬇️  ${asset.name} → ${destName}`);
                await downloadAsset(asset, destPath, headers);
                totalDownloaded++;
            }

            const catalogPath = path.join(CATALOGS_DIR, buildTarget);
            writeMetadataFile(catalogPath, metadataId, version);
            writeReleaseDetailsFile(metadataId, version);
            totalDownloaded += 2;
            continue;
        }

        // Legacy releases: assets already named CCC.*_<version>-<type>.yaml
        for (const asset of release.assets) {
            if (!asset.name.endsWith('.yaml')) {
                continue;
            }

            const fileMatch = asset.name.match(TYPED_RELEASE_FILE);
            if (!fileMatch?.groups) {
                continue;
            }

            const { catalogId, version } = fileMatch.groups;
            if (versionFilter && version !== versionFilter) {
                continue;
            }

            if (shouldIgnoreCatalog(catalogId, version, ignorePatterns)) {
                ignoredCatalogs++;
                continue;
            }

            const destPath = path.join(OUTPUT_DIR, asset.name);
            console.log(`⬇️  [legacy] ${asset.name}`);
            await downloadAsset(asset, destPath, headers);
            legacyDownloaded++;
        }
    }

    console.log(`\n✅ Downloaded ${totalDownloaded} YAML files from typed catalog releases.`);
    if (legacyDownloaded > 0) {
        console.log(`✅ Downloaded ${legacyDownloaded} legacy-format release files.`);
    }
    if (skippedReleases > 0) {
        console.log(`⏭️  Skipped ${skippedReleases} releases with no matching assets.`);
    }
    if (ignoredCatalogs > 0) {
        console.log(`🚫 Ignored ${ignoredCatalogs} catalogs matching ignore patterns.`);
    }
}

downloadYamlAssets().catch((err) => {
    console.error('❌ Error downloading YAML files:', err.message);
    process.exit(1);
});

export { downloadYamlAssets };
