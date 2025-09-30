import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CATALOGS_DIR = path.join(__dirname, '../../catalogs');
const OUTPUT_DIR = path.join(__dirname, '../src/data/ccc-releases');
const DELIVERY_TOOLKIT_DIR = path.join(__dirname, '../../delivery-toolkit');

interface CatalogDirectory {
    category: string;
    service: string;
    fullPath: string;
    hasReleaseDetails: boolean;
    needsDevReleaseDetails: boolean;
}

interface GenerationResult {
    catalogPath: string;
    success: boolean;
    error?: string;
    generatedFiles: string[];
}

/**
 * Creates a temporary DEV release-details.yaml file for catalogs without one
 * Also creates a backup of the original metadata.yaml and creates a DEV version
 */
function createDevReleaseDetails(catalogPath: string): { releaseDetailsCreated: boolean; metadataBackedUp: boolean } {
    const releaseDetailsPath = path.join(catalogPath, 'release-details.yaml');
    const metadataPath = path.join(catalogPath, 'metadata.yaml');
    const metadataBackupPath = path.join(catalogPath, 'metadata.yaml.backup');

    let releaseDetailsCreated = false;
    let metadataBackedUp = false;

    // Create DEV release details
    const devReleaseDetails = `- version: "DEV"
  assurance-level: ""
  threat-model-url: ""
  threat-model-author: ""
  red-team: ""
  red-team-exercise-url: ""
  release-manager:
    name: Development Build
    github-id: ""
    company: ""
    quote: "This is a development build without formal release details."
  change-log:
    - "Development build - no formal changelog available"
  contributors:
    - name: Development Team
      github-id: ""
      company: ""
`;

    fs.writeFileSync(releaseDetailsPath, devReleaseDetails);
    releaseDetailsCreated = true;
    console.log(`  📝 Created temporary DEV release-details.yaml`);

    // If metadata.yaml exists, create a DEV version of it too
    if (fs.existsSync(metadataPath)) {
        try {
            // Backup original metadata
            const originalMetadata = fs.readFileSync(metadataPath, 'utf8');
            fs.writeFileSync(metadataBackupPath, originalMetadata);
            metadataBackedUp = true;

            // Modify metadata to use DEV version
            const devMetadata = originalMetadata.replace(
                /version:\s*["']?[^"'\n]*["']?/,
                'version: "DEV"'
            );

            fs.writeFileSync(metadataPath, devMetadata);
            console.log(`  📝 Created temporary DEV metadata.yaml (backed up original)`);
        } catch (error) {
            console.log(`  ⚠️  Failed to create DEV metadata: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    return { releaseDetailsCreated, metadataBackedUp };
}

/**
 * Removes temporary DEV release-details.yaml file and restores original metadata
 */
function removeDevReleaseDetails(catalogPath: string, metadataBackedUp: boolean = false): void {
    const releaseDetailsPath = path.join(catalogPath, 'release-details.yaml');
    const metadataPath = path.join(catalogPath, 'metadata.yaml');
    const metadataBackupPath = path.join(catalogPath, 'metadata.yaml.backup');

    // Remove temporary release details
    try {
        fs.unlinkSync(releaseDetailsPath);
        console.log(`  🧹 Removed temporary DEV release-details.yaml`);
    } catch (error) {
        console.log(`  ⚠️  Failed to remove temporary release-details.yaml: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Restore original metadata if we backed it up
    if (metadataBackedUp && fs.existsSync(metadataBackupPath)) {
        try {
            const originalMetadata = fs.readFileSync(metadataBackupPath, 'utf8');
            fs.writeFileSync(metadataPath, originalMetadata);
            fs.unlinkSync(metadataBackupPath);
            console.log(`  🧹 Restored original metadata.yaml`);
        } catch (error) {
            console.log(`  ⚠️  Failed to restore metadata.yaml: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Discovers all catalog directories, including those without release-details.yaml files
 */
async function discoverCatalogDirectories(): Promise<CatalogDirectory[]> {
    const catalogs: CatalogDirectory[] = [];

    console.log('🔍 Discovering catalog directories...');

    const categories = fs.readdirSync(CATALOGS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    for (const category of categories) {
        const categoryPath = path.join(CATALOGS_DIR, category);

        const services = fs.readdirSync(categoryPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const service of services) {
            const servicePath = path.join(categoryPath, service);
            const releaseDetailsPath = path.join(servicePath, 'release-details.yaml');
            const hasReleaseDetails = fs.existsSync(releaseDetailsPath);

            // Check if this directory has the required catalog files (controls.yaml, capabilities.yaml, etc.)
            const hasControls = fs.existsSync(path.join(servicePath, 'controls.yaml'));
            const hasCapabilities = fs.existsSync(path.join(servicePath, 'capabilities.yaml'));
            const hasThreats = fs.existsSync(path.join(servicePath, 'threats.yaml'));

            // Only include directories that look like valid catalogs
            const isValidCatalog = hasControls || hasCapabilities || hasThreats;

            if (isValidCatalog) {
                catalogs.push({
                    category,
                    service,
                    fullPath: servicePath,
                    hasReleaseDetails,
                    needsDevReleaseDetails: !hasReleaseDetails
                });

                if (hasReleaseDetails) {
                    console.log(`  ✅ Found: ${category}/${service}`);
                } else {
                    console.log(`  🔧 Will create DEV version: ${category}/${service}`);
                }
            } else {
                console.log(`  ⏭️  Skipping non-catalog: ${category}/${service}`);
            }
        }
    }

    const validCatalogs = catalogs.length;
    const catalogsWithReleases = catalogs.filter(c => c.hasReleaseDetails).length;
    const catalogsNeedingDev = catalogs.filter(c => c.needsDevReleaseDetails).length;

    console.log(`\n📦 Found ${validCatalogs} valid catalogs:`);
    console.log(`  - ${catalogsWithReleases} with existing release details`);
    console.log(`  - ${catalogsNeedingDev} will use DEV version`);

    return catalogs;
}

/**
 * Generates release artifacts for a single catalog using the Go delivery toolkit
 */
async function generateCatalogArtifacts(catalog: CatalogDirectory): Promise<GenerationResult> {
    const buildTarget = `${catalog.category}/${catalog.service}`;
    const outputDir = path.join(DELIVERY_TOOLKIT_DIR, 'artifacts');

    console.log(`\n🔨 Generating artifacts for ${buildTarget}...`);

    let tempFileInfo = { releaseDetailsCreated: false, metadataBackedUp: false };

    try {
        // Create temporary DEV release details if needed
        if (catalog.needsDevReleaseDetails) {
            tempFileInfo = createDevReleaseDetails(catalog.fullPath);
        }

        // Ensure output directory exists
        fs.mkdirSync(outputDir, { recursive: true });

        // Change to delivery-toolkit directory and run the generation command
        const command = `go run main.go generate-release-artifacts -t "${buildTarget}" -o "${outputDir}"`;

        console.log(`  📋 Running: ${command}`);
        console.log(`  📂 Working directory: ${DELIVERY_TOOLKIT_DIR}`);

        const { stdout, stderr } = await execAsync(command, {
            cwd: DELIVERY_TOOLKIT_DIR,
            env: { ...process.env }
        });

        if (stderr) {
            console.log(`  ⚠️  Stderr: ${stderr}`);
        }

        if (stdout) {
            console.log(`  📝 Stdout: ${stdout}`);
        }

        // Find generated files for this catalog
        const generatedFiles = findGeneratedFiles(outputDir, catalog);

        if (generatedFiles.length === 0) {
            throw new Error('No artifacts were generated');
        }

        console.log(`  ✅ Generated ${generatedFiles.length} files:`);
        generatedFiles.forEach(file => console.log(`    - ${path.basename(file)}`));

        return {
            catalogPath: buildTarget,
            success: true,
            generatedFiles
        };

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`  ❌ Error generating artifacts: ${errorMsg}`);

        return {
            catalogPath: buildTarget,
            success: false,
            error: errorMsg,
            generatedFiles: []
        };
    } finally {
        // Clean up temporary files if we created them
        if (tempFileInfo.releaseDetailsCreated && catalog.needsDevReleaseDetails) {
            removeDevReleaseDetails(catalog.fullPath, tempFileInfo.metadataBackedUp);
        }
    }
}

/**
 * Finds generated files for a specific catalog in the artifacts directory
 */
function findGeneratedFiles(artifactsDir: string, catalog: CatalogDirectory): string[] {
    const files: string[] = [];

    if (!fs.existsSync(artifactsDir)) {
        return files;
    }

    const allFiles = fs.readdirSync(artifactsDir);

    // The delivery toolkit generates files with patterns like:
    // CCC.{ServiceId}_{Version}.yaml
    // CCC.{ServiceId}_{Version}.md
    // CCC.{ServiceId}_{Version}.oscal.json
    // CCC.{ServiceId}_{Version}-release-details.yaml

    for (const file of allFiles) {
        const filePath = path.join(artifactsDir, file);
        const stat = fs.statSync(filePath);

        if (stat.isFile()) {
            // Check if this file was recently generated (within last 5 minutes)
            const now = new Date();
            const fileTime = stat.mtime;
            const timeDiff = now.getTime() - fileTime.getTime();
            const fiveMinutes = 5 * 60 * 1000;

            if (timeDiff <= fiveMinutes) {
                files.push(filePath);
            }
        }
    }

    return files;
}

/**
 * Copies generated files to the website data directory
 */
async function copyFilesToWebsite(generatedFiles: string[]): Promise<void> {
    console.log('\n📁 Copying files to website directory...');

    // Ensure output directory exists
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    for (const sourceFile of generatedFiles) {
        const fileName = path.basename(sourceFile);
        const targetFile = path.join(OUTPUT_DIR, fileName);

        try {
            fs.copyFileSync(sourceFile, targetFile);
            console.log(`  ✅ Copied: ${fileName}`);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.log(`  ❌ Failed to copy ${fileName}: ${errorMsg}`);
        }
    }
}

/**
 * Cleans up artifacts directory after copying files
 */
async function cleanupArtifacts(artifactsDir: string): Promise<void> {
    console.log('\n🧹 Cleaning up artifacts directory...');

    try {
        if (fs.existsSync(artifactsDir)) {
            const files = fs.readdirSync(artifactsDir);
            for (const file of files) {
                const filePath = path.join(artifactsDir, file);
                if (fs.statSync(filePath).isFile()) {
                    fs.unlinkSync(filePath);
                }
            }
            console.log('  ✅ Artifacts directory cleaned');
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`  ⚠️  Failed to clean artifacts: ${errorMsg}`);
    }
}

/**
 * Main function to generate all release catalogs
 */
async function generateAllReleaseCatalogs(): Promise<void> {
    console.log('🚀 Starting release catalog generation...\n');

    try {
        // Check if delivery toolkit exists
        if (!fs.existsSync(DELIVERY_TOOLKIT_DIR)) {
            throw new Error(`Delivery toolkit not found at: ${DELIVERY_TOOLKIT_DIR}`);
        }

        // Check if main.go exists in delivery toolkit
        const mainGoPath = path.join(DELIVERY_TOOLKIT_DIR, 'main.go');
        if (!fs.existsSync(mainGoPath)) {
            throw new Error(`main.go not found in delivery toolkit: ${mainGoPath}`);
        }

        console.log('✅ Delivery toolkit found');

        // Discover catalog directories
        const catalogs = await discoverCatalogDirectories();

        if (catalogs.length === 0) {
            console.log('⚠️  No valid catalogs found');
            return;
        }

        // Generate artifacts for each catalog
        const results: GenerationResult[] = [];
        const allGeneratedFiles: string[] = [];

        for (const catalog of catalogs) {
            const result = await generateCatalogArtifacts(catalog);
            results.push(result);

            if (result.success) {
                allGeneratedFiles.push(...result.generatedFiles);
            }
        }

        // Copy all generated files to website
        if (allGeneratedFiles.length > 0) {
            await copyFilesToWebsite(allGeneratedFiles);
        }

        // Clean up artifacts directory
        await cleanupArtifacts(path.join(DELIVERY_TOOLKIT_DIR, 'artifacts'));

        // Print summary
        console.log('\n📊 Generation Summary:');
        console.log('='.repeat(50));

        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        console.log(`✅ Successful: ${successful.length}`);
        successful.forEach(r => console.log(`  - ${r.catalogPath}`));

        if (failed.length > 0) {
            console.log(`❌ Failed: ${failed.length}`);
            failed.forEach(r => console.log(`  - ${r.catalogPath}: ${r.error}`));
        }

        console.log(`📁 Total files copied: ${allGeneratedFiles.length}`);
        console.log('✅ Release catalog generation completed!');

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Fatal error: ${errorMsg}`);
        process.exit(1);
    }
}

// Main execution
if (require.main === module) {
    generateAllReleaseCatalogs().catch((err) => {
        console.error('❌ Error generating release catalogs:', err.message);
        process.exit(1);
    });
}

export { generateAllReleaseCatalogs };
