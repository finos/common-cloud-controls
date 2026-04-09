import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { CFISourceDetails } from '../src/types/cfi';

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
    /** REST API URL for this artifact (stable). */
    url: string;
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
    head_branch: string;
}

interface GitHubWorkflowRuns {
    workflow_runs: GitHubWorkflowRun[];
}

interface GitHubBranch {
    name: string;
}

async function getRepositoryOwnerAndName(url: string): Promise<{ owner: string; repo: string }> {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
        throw new Error(`Invalid GitHub URL: ${url}`);
    }
    return { owner: match[1], repo: match[2] };
}

/** Safe folder / zip suffix derived from a git branch name (e.g. feature/foo → feature-foo). */
function branchNameToDirSuffix(branchName: string): string {
    const s = branchName
        .replace(/\//g, '-')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return s.length > 0 ? s : 'branch';
}

async function listAllBranchNames(owner: string, repo: string): Promise<string[]> {
    const headers = GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {};
    const names: string[] = [];
    let page = 1;

    try {
        while (true) {
            const response = await axios.get<GitHubBranch[]>(
                `${GITHUB_API}/repos/${owner}/${repo}/branches?per_page=100&page=${page}`,
                { headers }
            );
            if (response.data.length === 0) {
                break;
            }
            names.push(...response.data.map((b) => b.name));
            if (response.data.length < 100) {
                break;
            }
            page++;
        }
        return names;
    } catch (error) {
        console.warn(`⚠️  Could not list branches for ${owner}/${repo}: ${error}`);
        return [];
    }
}

/** Latest *successful* workflow run for cfi-test.yml on the given branch (per_page=1, newest first among successes). */
async function getLatestWorkflowRunForBranch(
    owner: string,
    repo: string,
    branchName: string
): Promise<GitHubWorkflowRun | null> {
    const headers = GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {};
    const branchQuery = `&branch=${encodeURIComponent(branchName)}`;

    try {
        const response = await axios.get<GitHubWorkflowRuns>(
            `${GITHUB_API}/repos/${owner}/${repo}/actions/runs?workflow_id=cfi-test.yml&status=success&per_page=1${branchQuery}`,
            { headers }
        );

        if (response.data.workflow_runs.length > 0) {
            return response.data.workflow_runs[0];
        }
        return null;
    } catch (error) {
        console.warn(`⚠️  Could not fetch workflow runs for ${owner}/${repo} branch ${branchName}: ${error}`);
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

/**
 * Artifact zips use config/{baseId}.json; the site expects config/{extractFolderName}.json
 * where extractFolderName is baseId + "-" + branchDirSuffix (e.g. secure-azure-storage-main).
 */
function buildSourceDetails(
    run: GitHubWorkflowRun,
    artifact: GitHubArtifact,
    downloadedAt: string,
    repositoryInfo: CFIRepository,
    resultId: string
): CFISourceDetails {
    const artifactUrl = artifact.url?.trim() || artifact.archive_download_url;
    return {
        result_id: resultId,
        branch: run.head_branch ?? 'unknown',
        repository_url: repositoryInfo.url,
        repository_description: repositoryInfo.description,
        artifact_url: artifactUrl,
        artifact_created_at: artifact.created_at,
        downloaded_at: downloadedAt,
    };
}

function writeSourceDetails(extractDir: string, details: CFISourceDetails): void {
    const target = path.join(extractDir, 'source-details.json');
    fs.writeFileSync(target, JSON.stringify(details, null, 2), 'utf8');
    console.log(`📝 Wrote ${path.basename(target)} for ${path.basename(extractDir)}`);
}

function alignConfigJsonWithExtractDir(extractDir: string, baseConfigId: string): void {
    const configDir = path.join(extractDir, 'config');
    if (!fs.existsSync(configDir)) {
        return;
    }
    const canonicalPath = path.join(configDir, `${baseConfigId}.json`);
    const folderName = path.basename(extractDir);
    const expectedPath = path.join(configDir, `${folderName}.json`);
    if (fs.existsSync(canonicalPath) && canonicalPath !== expectedPath) {
        fs.renameSync(canonicalPath, expectedPath);
        console.log(`📎 Renamed config to ${path.basename(expectedPath)} for ${folderName}`);
    }
}

async function unzipArtifact(
    zipPath: string,
    artifactName: string,
    repositoryInfo: CFIRepository,
    branchDirSuffix: string,
    run: GitHubWorkflowRun,
    artifact: GitHubArtifact,
    downloadedAt: string
): Promise<void> {
    try {
        console.log(`📦 Unzipping ${artifactName} (${branchDirSuffix})...`);

        const cleanName = artifactName.replace(/^cfi-results-/, '');
        const repoDir = path.join(OUTPUT_DIR, 'test-results', repositoryInfo.destination);
        const extractDir = path.join(repoDir, `${cleanName}-${branchDirSuffix}`);

        fs.mkdirSync(path.join(OUTPUT_DIR, 'test-results'), { recursive: true });
        fs.mkdirSync(repoDir, { recursive: true });

        try {
            await execAsync(`unzip -o "${zipPath}" -d "${extractDir}"`);
            console.log(`📦 Extraction completed for ${cleanName}-${branchDirSuffix}`);
        } catch (error) {
            console.error(`❌ Extraction failed for ${cleanName}-${branchDirSuffix}:`, error);
            throw error;
        }

        alignConfigJsonWithExtractDir(extractDir, cleanName);

        const resultId = path.basename(extractDir);
        writeSourceDetails(extractDir, buildSourceDetails(run, artifact, downloadedAt, repositoryInfo, resultId));

        const resultsDir = path.join(extractDir, 'results');
        if (fs.existsSync(resultsDir)) {
            const ocsfFiles = fs.readdirSync(resultsDir).filter(f => f.endsWith('ocsf.json'));
            for (const ocsfFile of ocsfFiles) {
                const ocsfPath = path.join(resultsDir, ocsfFile);
                try {
                    const content = fs.readFileSync(ocsfPath, 'utf8');
                    JSON.parse(content);
                    console.log(`✅ Verified ${ocsfFile} is valid JSON`);
                } catch (error) {
                    console.error(`❌ Invalid JSON in ${ocsfFile}:`, error);
                    fs.unlinkSync(ocsfPath);
                    console.log(`🗑️  Removed corrupted file: ${ocsfFile}`);
                }
            }
        }

        console.log(`✅ Extracted ${cleanName}-${branchDirSuffix} to ${extractDir}`);

        fs.unlinkSync(zipPath);
        console.log(`🗑️  Cleaned up ${zipPath}`);
    } catch (error) {
        console.error(`❌ Error unzipping ${artifactName}: ${error}`);
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

            const branchNames = await listAllBranchNames(owner, repoName);
            if (branchNames.length === 0) {
                console.log(`⚠️  No branches found for ${repo.name}`);
                continue;
            }
            console.log(`🌿 ${branchNames.length} branch(es) to check for cfi-test.yml runs`);

            const repoOutputDir = path.join(OUTPUT_DIR, 'cfi-configurations', repo.name);
            fs.mkdirSync(repoOutputDir, { recursive: true });

            async function processRunArtifacts(
                run: GitHubWorkflowRun,
                branchDirSuffix: string,
                branchLabel: string
            ): Promise<void> {
                const artifacts = await getArtifacts(owner, repoName, run.id);
                const resultArtifacts = artifacts.filter((a) => a.name.startsWith('cfi-results-'));

                if (resultArtifacts.length === 0) {
                    console.log(
                        `⚠️  No cfi-results-* artifacts for ${repo.name} (branch ${branchLabel}, run ${run.id})`
                    );
                    return;
                }

                console.log(
                    `📦 Found ${resultArtifacts.length} result artifacts (branch ${branchLabel}, run ${run.id})`
                );

                for (const artifact of resultArtifacts) {
                    const outputPath = path.join(repoOutputDir, `${artifact.name}-${branchDirSuffix}.zip`);
                    await downloadArtifact(owner, repoName, artifact, outputPath);
                    const downloadedAt = new Date().toISOString();
                    await unzipArtifact(outputPath, artifact.name, repo, branchDirSuffix, run, artifact, downloadedAt);
                }
            }

            for (const branchName of branchNames) {
                const branchDirSuffix = branchNameToDirSuffix(branchName);
                const run = await getLatestWorkflowRunForBranch(owner, repoName, branchName);
                if (!run) {
                    console.log(`⏭️  No cfi-test.yml run for branch ${branchName}, skipping`);
                    continue;
                }
                console.log(
                    `📋 Branch ${branchName}: latest run ${run.id} (${run.status}/${run.conclusion ?? 'n/a'})`
                );
                await processRunArtifacts(run, branchDirSuffix, branchName);
            }

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
