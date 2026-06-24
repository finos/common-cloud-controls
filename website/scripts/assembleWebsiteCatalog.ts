import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import yaml from 'js-yaml';

const execFileAsync = promisify(execFile);

const REPO_ROOT = path.join(__dirname, '../..');
const CATALOGS_DIR = path.join(REPO_ROOT, 'catalogs');
const BATCH_COMPILE_SCRIPT = path.join(__dirname, 'batch-compile-catalogs.sh');
const OUTPUT_DIR = path.join(__dirname, '../src/data/ccc-releases');
const STAGING_DIR = path.join(OUTPUT_DIR, '.compile-staging');

const ASSET_TYPES = ['capabilities', 'threats', 'controls'] as const;
type AssetType = (typeof ASSET_TYPES)[number];

const CORE_BUILD_TARGET = 'core/ccc';
const CORE_VERSION = 'v2025.10';

interface CatalogTarget {
    buildTarget: string;
    catalogPath: string;
    metadataId: string;
}

interface PublishResult {
    buildTarget: string;
    success: boolean;
    error?: string;
    outputFiles: string[];
}

function loadYamlFile<T>(filePath: string): T | null {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return yaml.load(fs.readFileSync(filePath, 'utf8')) as T;
}

function stagedArtifactPath(buildTarget: string, assetType: AssetType): string {
    return path.join(STAGING_DIR, buildTarget, `${assetType}.yaml`);
}

function outputFileName(metadataId: string, version: string, suffix: string): string {
    return `${metadataId}_${version}-${suffix}.yaml`;
}

function devReleaseDetailsYaml(): string {
    return yaml.dump(
        [
            {
                version: 'DEV',
                'assurance-level': '',
                'threat-model-url': '',
                'threat-model-author': '',
                'red-team': '',
                'red-team-exercise-url': '',
                'release-manager': {
                    name: 'Development Build',
                    'github-id': '',
                    company: '',
                    quote: 'This is a development build without formal release details.',
                },
                'change-log': ['Development build - no formal changelog available'],
                contributors: [
                    {
                        name: 'Development Team',
                        'github-id': '',
                        company: '',
                    },
                ],
            },
        ],
        { lineWidth: -1, noRefs: true, sortKeys: false }
    );
}

async function runBatchCompile(version: string): Promise<void> {
    fs.rmSync(STAGING_DIR, { recursive: true, force: true });
    fs.mkdirSync(STAGING_DIR, { recursive: true });

    console.log(`📋 Compiling into ${STAGING_DIR}\n`);

    await execFileAsync(
        'bash',
        [BATCH_COMPILE_SCRIPT, '--version', version, '--output-dir', STAGING_DIR],
        {
            cwd: REPO_ROOT,
            env: { ...process.env, VERSION: version },
            maxBuffer: 10 * 1024 * 1024,
        }
    );
}

function moveCompiledAsset(
    buildTarget: string,
    assetType: AssetType,
    metadataId: string,
    version: string,
    outputFiles: string[]
): boolean {
    const source = stagedArtifactPath(buildTarget, assetType);
    if (!fs.existsSync(source)) {
        return false;
    }

    const dest = path.join(OUTPUT_DIR, outputFileName(metadataId, version, assetType));
    fs.renameSync(source, dest);
    outputFiles.push(dest);
    return true;
}

function publishMetadata(catalogPath: string, metadataId: string, version: string, outputFiles: string[]): void {
    const metadata = loadYamlFile<{ metadata?: Record<string, unknown> }>(path.join(catalogPath, 'metadata.yaml'));
    if (!metadata?.metadata) {
        throw new Error('metadata.yaml missing or invalid');
    }

    const metaBlock = { ...metadata.metadata, version, 'last-modified': new Date().toISOString() };
    const dest = path.join(OUTPUT_DIR, outputFileName(metadataId, version, 'metadata'));
    fs.writeFileSync(dest, yaml.dump({ metadata: metaBlock }, { lineWidth: -1, noRefs: true, sortKeys: false }), 'utf8');
    outputFiles.push(dest);
}

function publishReleaseDetails(metadataId: string, version: string, outputFiles: string[]): void {
    const dest = path.join(OUTPUT_DIR, outputFileName(metadataId, version, 'release-details'));
    fs.writeFileSync(dest, devReleaseDetailsYaml(), 'utf8');
    outputFiles.push(dest);
}

function publishCatalogTarget(target: CatalogTarget, version: string): PublishResult {
    const { buildTarget, catalogPath, metadataId } = target;
    const outputFiles: string[] = [];

    try {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });

        const movedTypes = ASSET_TYPES.filter((type) =>
            moveCompiledAsset(buildTarget, type, metadataId, version, outputFiles)
        );

        if (movedTypes.length === 0) {
            return {
                buildTarget,
                success: false,
                error: 'no compiled Gemara artifacts (capabilities / threats / controls)',
                outputFiles: [],
            };
        }

        publishMetadata(catalogPath, metadataId, version, outputFiles);
        publishReleaseDetails(metadataId, version, outputFiles);

        return { buildTarget, success: true, outputFiles };
    } catch (error) {
        return {
            buildTarget,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            outputFiles,
        };
    }
}

function publishCoreCatalog(): PublishResult {
    const metadata = loadYamlFile<{ metadata?: { id?: string } }>(
        path.join(CATALOGS_DIR, CORE_BUILD_TARGET, 'metadata.yaml')
    );
    const metadataId = metadata?.metadata?.id ?? 'CCC.Core';
    const outputFiles: string[] = [];

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const movedTypes = ASSET_TYPES.filter((type) =>
        moveCompiledAsset(CORE_BUILD_TARGET, type, metadataId, CORE_VERSION, outputFiles)
    );

    if (movedTypes.length === 0) {
        return {
            buildTarget: CORE_BUILD_TARGET,
            success: false,
            error: 'no compiled core/ccc Gemara artifacts',
            outputFiles: [],
        };
    }

    publishMetadata(path.join(CATALOGS_DIR, CORE_BUILD_TARGET), metadataId, CORE_VERSION, outputFiles);

    return { buildTarget: CORE_BUILD_TARGET, success: true, outputFiles };
}

function discoverCatalogTargets(): CatalogTarget[] {
    const targets: CatalogTarget[] = [];

    for (const category of fs.readdirSync(CATALOGS_DIR, { withFileTypes: true })) {
        if (!category.isDirectory()) {
            continue;
        }
        const categoryPath = path.join(CATALOGS_DIR, category.name);
        for (const service of fs.readdirSync(categoryPath, { withFileTypes: true })) {
            if (!service.isDirectory()) {
                continue;
            }
            const catalogPath = path.join(categoryPath, service.name);
            const buildTarget = `${category.name}/${service.name}`;
            if (buildTarget === CORE_BUILD_TARGET) {
                continue;
            }
            if (!fs.existsSync(path.join(catalogPath, 'metadata.yaml'))) {
                continue;
            }
            const metadata = loadYamlFile<{ metadata?: { id?: string } }>(path.join(catalogPath, 'metadata.yaml'));
            const metadataId = metadata?.metadata?.id;
            if (!metadataId) {
                console.log(`  ⏭️  Skipping ${buildTarget}: metadata.id missing`);
                continue;
            }
            targets.push({ buildTarget, catalogPath, metadataId });
        }
    }

    return targets.sort((a, b) => a.buildTarget.localeCompare(b.buildTarget));
}

function cleanupStaging(): void {
    fs.rmSync(STAGING_DIR, { recursive: true, force: true });
}

export async function assembleAllWebsiteCatalogs(version = 'DEV'): Promise<void> {
    console.log('\n📦 Building Gemara catalogs for website...\n');
    try {
        await runBatchCompile(version);

        const results: PublishResult[] = [];

        console.log(`\n🔨 Publishing ${CORE_BUILD_TARGET} (${CORE_VERSION})...`);
        const coreResult = publishCoreCatalog();
        results.push(coreResult);
        if (coreResult.success) {
            coreResult.outputFiles.forEach((file) => console.log(`  ✅ ${path.basename(file)}`));
        } else {
            console.log(`  ⏭️  Skipped: ${coreResult.error}`);
        }

        for (const target of discoverCatalogTargets()) {
            console.log(`\n🔨 Publishing ${target.buildTarget} (${target.metadataId})...`);
            const result = publishCatalogTarget(target, version);
            results.push(result);
            if (result.success) {
                result.outputFiles.forEach((file) => console.log(`  ✅ ${path.basename(file)}`));
            } else {
                console.log(`  ⏭️  Skipped: ${result.error}`);
            }
        }

        const successful = results.filter((r) => r.success);
        const skipped = results.filter((r) => !r.success);

        console.log('\n📊 Publish Summary:');
        console.log('='.repeat(50));
        console.log(`✅ Published: ${successful.length}`);
        successful.forEach((r) => console.log(`  - ${r.buildTarget}`));
        if (skipped.length > 0) {
            console.log(`⏭️  Skipped: ${skipped.length}`);
            skipped.forEach((r) => console.log(`  - ${r.buildTarget}: ${r.error}`));
        }

        if (successful.length === 0) {
            throw new Error('No Gemara catalogs were published');
        }
    } finally {
        cleanupStaging();
    }
}

if (require.main === module) {
    const version = process.env.CATALOG_VERSION ?? 'DEV';
    assembleAllWebsiteCatalogs(version)
        .then(() => console.log('\n✅ Gemara catalog build completed!'))
        .catch((err) => {
            console.error('❌ Error building Gemara catalogs:', err.message);
            process.exit(1);
        });
}
