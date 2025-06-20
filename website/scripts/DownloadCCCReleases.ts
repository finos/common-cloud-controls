import fs from 'fs';
import path from 'path';
import axios from 'axios';

const OUTPUT_DIR = path.join(__dirname, '../src/data/ccc-releases');
const GITHUB_API = 'https://api.github.com/repos/finos/common-cloud-controls/releases';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

interface ReleaseAsset {
    name: string;
    browser_download_url: string;
}

interface GitHubRelease {
    assets: ReleaseAsset[];
}

async function downloadYamlAssets(): Promise<void> {
    const headers = GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {};

    console.log('📦 Fetching releases from GitHub...');
    const response = await axios.get<GitHubRelease[]>(GITHUB_API, { headers });
    const releases = response.data;

    for (const release of releases) {
        for (const asset of release.assets) {
            if (asset.name.endsWith('.yaml')) {
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
            }
        }
    }

    console.log('✅ All YAML assets downloaded.');
}

downloadYamlAssets().catch((err) => {
    console.error('❌ Error downloading YAML files:', err.message);
});
