import fs from 'fs';
import path from 'path';
import axios from 'axios';

const OUTPUT_DIR = path.join(__dirname, '../src/data/ccc-releases');
const GITHUB_API = 'https://api.github.com/repos/finos/common-cloud-controls/releases';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const IGNORE_LIST_PATH = path.join(__dirname, 'ignorelist.txt');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

interface ReleaseAsset {
    name: string;
    browser_download_url: string;
}

interface GitHubRelease {
    assets: ReleaseAsset[];
}

function loadIgnoreList(): string[] {
    try {
        if (!fs.existsSync(IGNORE_LIST_PATH)) {
            console.log('📝 No ignore list found, downloading all files');
            return [];
        }

        const content = fs.readFileSync(IGNORE_LIST_PATH, 'utf8');
        const ignorePatterns = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#')); // Remove empty lines and comments

        if (ignorePatterns.length > 0) {
            console.log(`📝 Loaded ${ignorePatterns.length} ignore patterns: ${ignorePatterns.join(', ')}`);
        }

        return ignorePatterns;
    } catch (error) {
        console.log(`⚠️  Failed to load ignore list: ${error instanceof Error ? error.message : String(error)}`);
        return [];
    }
}

function shouldIgnoreFile(fileName: string, ignorePatterns: string[]): boolean {
    return ignorePatterns.some(pattern => fileName.includes(pattern));
}

async function downloadYamlAssets(): Promise<void> {
    const headers = GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {};
    const ignorePatterns = loadIgnoreList();

    console.log('📦 Fetching releases from GitHub...');
    const response = await axios.get<GitHubRelease[]>(GITHUB_API, { headers });
    const releases = response.data;

    let totalDownloaded = 0;
    let skippedReleases = 0;
    let ignoredFiles = 0;

    for (const release of releases) {
        // Get all YAML assets for this release
        const yamlAssets = release.assets.filter(asset => asset.name.endsWith('.yaml'));

        if (yamlAssets.length === 0) {
            continue; // No YAML files in this release
        }

        // Group assets by catalog (extract base name without version and extension)
        const catalogGroups = new Map<string, ReleaseAsset[]>();

        for (const asset of yamlAssets) {
            // Extract catalog base name (e.g., "CCC.KeyMgmt" from "CCC.KeyMgmt_2025.07.yaml")
            const baseName = asset.name.replace(/_([\d.]+)\.yaml$/, '').replace(/-release-details\.yaml$/, '');

            if (!catalogGroups.has(baseName)) {
                catalogGroups.set(baseName, []);
            }
            catalogGroups.get(baseName)!.push(asset);
        }

        // For each catalog group, check if it has both main file and release-details file
        for (const [catalogName, assets] of catalogGroups) {
            // Check if this catalog should be ignored
            if (shouldIgnoreFile(catalogName, ignorePatterns)) {
                console.log(`🚫 Ignoring ${catalogName} - matches ignore pattern`);
                ignoredFiles += assets.length;
                continue;
            }

            const hasMainFile = assets.some(asset =>
                !asset.name.includes('-release-details.yaml') && asset.name.startsWith(catalogName)
            );
            const hasReleaseDetails = assets.some(asset =>
                asset.name.includes('-release-details.yaml') && asset.name.startsWith(catalogName)
            );

            if (hasMainFile && hasReleaseDetails) {
                // Download all files for this catalog
                for (const asset of assets) {
                    const filePath = path.join(OUTPUT_DIR, asset.name);
                    console.log(`⬇️  Downloading ${asset.name} → ${filePath}`);

                    const download = await axios.get(asset.browser_download_url, {
                        responseType: 'stream',
                        headers,
                    });

                    const writer = fs.createWriteStream(filePath);
                    await new Promise<void>((resolve, reject) => {
                        download.data.pipe(writer);
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });

                    totalDownloaded++;
                }
            } else {
                console.log(`⏭️  Skipping ${catalogName} - missing ${!hasMainFile ? 'main file' : 'release-details file'}`);
                skippedReleases++;
            }
        }
    }

    console.log(`✅ Downloaded ${totalDownloaded} YAML files from complete releases.`);
    if (skippedReleases > 0) {
        console.log(`⏭️  Skipped ${skippedReleases} incomplete catalog releases.`);
    }
    if (ignoredFiles > 0) {
        console.log(`🚫 Ignored ${ignoredFiles} files matching ignore patterns.`);
    }
}

downloadYamlAssets().catch((err) => {
    console.error('❌ Error downloading YAML files:', err.message);
});
