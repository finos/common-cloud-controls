import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const OUTPUT_DIR = path.join(__dirname, '../src/data');
const GITHUB_API = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

interface CFIRepository {
    name: string;
    url: string;
    description: string;
    destination: string;
}

interface CFIRepositories {
    repositories: CFIRepository[];
}

interface GitHubArtifact {
    id: number;
    name: string;
    archive_download_url: string;
    created_at: string;
    updated_at: string;
}

interface GitHubWorkflowRun {
    id: number;
    name: string;
    status: string;
    conclusion: string;
    created_at: string;
    artifacts_url: string;
}

interface GitHubWorkflowRuns {
    workflow_runs: GitHubWorkflowRun[];
}

async function getRepositoryOwnerAndName(url: string): Promise<{ owner: string; repo: string }> {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
        throw new Error(`Invalid GitHub URL: ${url}`);
    }
    return { owner: match[1], repo: match[2] };
}

async function getLatestWorkflowRun(owner: string, repo: string): Promise<GitHubWorkflowRun | null> {
    const headers = GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {};

    try {
        // Get the latest workflow run for the CFI Build workflow
        const response = await axios.get<GitHubWorkflowRuns>(
            `${GITHUB_API}/repos/${owner}/${repo}/actions/runs?workflow_id=cfi-build.yml&per_page=1`,
            { headers }
        );

        if (response.data.workflow_runs.length > 0) {
            return response.data.workflow_runs[0];
        }
        return null;
    } catch (error) {
        console.warn(`⚠️  Could not fetch workflow runs for ${owner}/${repo}: ${error}`);
        return null;
    }
}

async function getArtifacts(owner: string, repo: string, runId: number): Promise<GitHubArtifact[]> {
    const headers = GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {};

    try {
        const response = await axios.get<{ artifacts: GitHubArtifact[] }>(
            `${GITHUB_API}/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`,
            { headers }
        );
        return response.data.artifacts;
    } catch (error) {
        console.warn(`⚠️  Could not fetch artifacts for run ${runId} in ${owner}/${repo}: ${error}`);
        return [];
    }
}

async function downloadArtifact(owner: string, repo: string, artifact: GitHubArtifact, outputPath: string): Promise<void> {
    const headers = GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {};

    try {
        console.log(`⬇️  Downloading ${artifact.name} from ${owner}/${repo}...`);

        const response = await axios.get(artifact.archive_download_url, {
            responseType: 'stream',
            headers,
        });

        const writer = fs.createWriteStream(outputPath);
        await new Promise<void>((resolve, reject) => {
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log(`✅ Downloaded ${artifact.name} to ${outputPath}`);
    } catch (error) {
        console.error(`❌ Error downloading ${artifact.name}: ${error}`);
    }
}

async function unzipArtifact(zipPath: string, artifactName: string, repositoryInfo: CFIRepository): Promise<void> {
    try {
        console.log(`📦 Unzipping ${artifactName}...`);

        // Remove 'cfi-results-' prefix and create clean directory name
        const cleanName = artifactName.replace(/^cfi-results-/, '');
        const repoDir = path.join(OUTPUT_DIR, 'test-results', repositoryInfo.destination);
        const extractDir = path.join(repoDir, cleanName);

        // Ensure the test-results directory and repo directory exist
        fs.mkdirSync(path.join(OUTPUT_DIR, 'test-results'), { recursive: true });
        fs.mkdirSync(repoDir, { recursive: true });

        // Extract the zip file using system unzip command
        try {
            await execAsync(`unzip -o "${zipPath}" -d "${extractDir}"`);
            console.log(`📦 Extraction completed for ${cleanName}`);
        } catch (error) {
            console.error(`❌ Extraction failed for ${cleanName}:`, error);
            throw error;
        }

        // Verify that OCSF files were extracted correctly
        const resultsDir = path.join(extractDir, 'results');
        if (fs.existsSync(resultsDir)) {
            const ocsfFiles = fs.readdirSync(resultsDir).filter(f => f.endsWith('.ocsf.json'));
            for (const ocsfFile of ocsfFiles) {
                const ocsfPath = path.join(resultsDir, ocsfFile);
                try {
                    const content = fs.readFileSync(ocsfPath, 'utf8');
                    JSON.parse(content); // This will throw if invalid JSON
                    console.log(`✅ Verified ${ocsfFile} is valid JSON`);
                } catch (error) {
                    console.error(`❌ Invalid JSON in ${ocsfFile}:`, error);
                    // Remove the corrupted file
                    fs.unlinkSync(ocsfPath);
                    console.log(`🗑️  Removed corrupted file: ${ocsfFile}`);
                }
            }
        }

        console.log(`✅ Extracted ${cleanName} to ${extractDir}`);

        // Clean up the zip file after extraction
        fs.unlinkSync(zipPath);
        console.log(`🗑️  Cleaned up ${zipPath}`);

    } catch (error) {
        console.error(`❌ Error unzipping ${artifactName}: ${error}`);
        // Don't throw - continue with other artifacts
    }
}

async function clearDestinationDirectories(repositories: CFIRepository[]): Promise<void> {
    console.log('🧹 Phase 1: Clearing destination directories...');

    for (const repo of repositories) {
        const repoDir = path.join(OUTPUT_DIR, 'test-results', repo.destination);
        if (fs.existsSync(repoDir)) {
            fs.rmSync(repoDir, { recursive: true, force: true });
            console.log(`🗑️  Cleared directory: ${repo.destination}`);
        } else {
            console.log(`📁 Directory doesn't exist (will be created): ${repo.destination}`);
        }
    }

    console.log('✅ Phase 1 completed: All destination directories cleared');
}

async function downloadCFIArtifacts(): Promise<void> {
    // Check if GITHUB_TOKEN is available
    if (!GITHUB_TOKEN) {
        console.warn('⚠️  GITHUB_TOKEN environment variable is not set.');
        console.warn('⚠️  GitHub requires authentication to download workflow artifacts.');
        console.warn('⚠️  Please set GITHUB_TOKEN environment variable with a valid GitHub personal access token.');
        console.warn('⚠️  Skipping CFI artifacts download.');
        return;
    }

    // Check if unzip command is available
    try {
        await execAsync('which unzip');
        console.log('✅ System unzip command found');
    } catch (error) {
        console.error('❌ System unzip command not found. Please install unzip or ensure it\'s in your PATH');
        return;
    }

    // Read the CFI repositories configuration
    const configPath = path.join(OUTPUT_DIR, 'cfi-repositories.json');
    if (!fs.existsSync(configPath)) {
        console.error('❌ CFI repositories configuration file not found:', configPath);
        return;
    }

    const config: CFIRepositories = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(`📦 Found ${config.repositories.length} CFI repositories to process`);

    // Phase 1: Clear all destination directories first
    await clearDestinationDirectories(config.repositories);

    // Phase 2: Download and process artifacts
    console.log('\n📥 Phase 2: Downloading and processing artifacts...');

    for (const repo of config.repositories) {
        try {
            console.log(`\n🔍 Processing repository: ${repo.name}`);

            const { owner, repo: repoName } = await getRepositoryOwnerAndName(repo.url);
            console.log(`📍 Repository: ${owner}/${repoName}`);

            // Get the latest workflow run
            const workflowRun = await getLatestWorkflowRun(owner, repoName);
            if (!workflowRun) {
                console.log(`⚠️  No workflow runs found for ${repo.name}`);
                continue;
            }

            console.log(`📋 Latest workflow run: ${workflowRun.name} (ID: ${workflowRun.id})`);
            console.log(`📊 Status: ${workflowRun.status}, Conclusion: ${workflowRun.conclusion}`);

            // Get artifacts from this run
            const artifacts = await getArtifacts(owner, repoName, workflowRun.id);
            if (artifacts.length === 0) {
                console.log(`⚠️  No artifacts found for ${repo.name}`);
                continue;
            }

            console.log(`📦 Found ${artifacts.length} artifacts`);

            // Create output directory for this repository
            const repoOutputDir = path.join(OUTPUT_DIR, 'cfi-configurations', repo.name);
            fs.mkdirSync(repoOutputDir, { recursive: true });

            // Download each artifact
            for (const artifact of artifacts) {
                if (artifact.name.startsWith('cfi-results-')) {
                    const outputPath = path.join(repoOutputDir, `${artifact.name}.zip`);
                    await downloadArtifact(owner, repoName, artifact, outputPath);

                    // Unzip the artifact into test-results directory
                    await unzipArtifact(outputPath, artifact.name, repo);
                }
            }

            // Create repository.json file at the repo level
            const repoDir = path.join(OUTPUT_DIR, 'test-results', repo.destination);
            const repositoryJsonPath = path.join(repoDir, 'repository.json');
            const repositoryData = {
                name: repo.name,
                url: repo.url,
                description: repo.description,
                downloaded_at: new Date().toISOString(),
                workflow_run_id: workflowRun.id,
                workflow_status: workflowRun.status,
                workflow_conclusion: workflowRun.conclusion
            };

            fs.writeFileSync(repositoryJsonPath, JSON.stringify(repositoryData, null, 2));
            console.log(`📝 Created repository.json at ${repositoryJsonPath}`);

        } catch (error) {
            console.error(`❌ Error processing ${repo.name}: ${error}`);
        }
    }

    // Phase 3: Clean up temporary cfi-configurations directory
    console.log('\n🧹 Phase 3: Cleaning up temporary directories...');
    const cfiConfigDir = path.join(OUTPUT_DIR, 'cfi-configurations');
    if (fs.existsSync(cfiConfigDir)) {
        fs.rmSync(cfiConfigDir, { recursive: true, force: true });
        console.log('🗑️  Removed cfi-configurations directory');
    }

    console.log('\n✅ CFI artifacts download completed.');
}

// Main execution
if (require.main === module) {
    downloadCFIArtifacts().catch((err) => {
        console.error('❌ Error downloading CFI artifacts:', err.message);
        process.exit(1);
    });
}

export { downloadCFIArtifacts };
