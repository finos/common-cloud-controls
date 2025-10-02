import fs from 'fs';
import path from 'path';
import type { LoadContext, Plugin } from '@docusaurus/types';
import { HomePageData, Configuration, ConfigurationPageData, RepositoryPageData, CFIConfigJson, TestResultItem, TestResultType } from '../../types/cfi';

function processOCSFResults(resultPath: string): TestResultItem[] {
    if (!fs.existsSync(resultPath)) {
        return [];
    }

    const result = fs.readFileSync(resultPath, 'utf8');
    const parsed = JSON.parse(result) as any[];

    console.log(`📊 Processing ${parsed.length} OCSF items from ${resultPath}`);

    return parsed
        .filter(item => {
            // Only include items that have CCC-Objects in compliance
            return item.unmapped?.compliance?.['CCC-Objects'] &&
                Array.isArray(item.unmapped.compliance['CCC-Objects']) &&
                item.unmapped.compliance['CCC-Objects'].length > 0;
        })
        .map((item, index) => {
            const resource = item.resources?.[0] || {};

            const testResult: TestResultItem = {
                id: `${item.finding_info?.uid || 'unknown'}-${index}`,
                test_requirements: item.unmapped.compliance['CCC-Objects'],
                result: item.status_code === 'PASS' ? TestResultType.PASS :
                    item.status_code === 'FAIL' ? TestResultType.FAIL : TestResultType.NA,
                name: item.finding_info?.title || 'Unknown Finding',
                message: item.message || '',
                test: item.metadata?.event_code || '',
                timestamp: item.finding_info?.created_time || Date.now(),
                further_info_url: item.unmapped?.related_url,
                resources: [resource.name || resource.uid || 'Unknown Resource'],
                // OCSF-specific fields
                status_code: item.status_code || 'UNKNOWN',
                status_detail: item.status_detail || '',
                resource_name: resource.name || resource.uid || 'Unknown Resource',
                resource_type: resource.type || 'Unknown Type',
                resource_uid: resource.uid,
                ccc_objects: item.unmapped.compliance['CCC-Objects'],
                finding_title: item.finding_info?.title || 'Unknown Finding',
                finding_uid: item.finding_info?.uid || ''
            };

            return testResult;
        });
}

function processAllOCSFResults(resultPath: string): TestResultItem[] {
    if (!fs.existsSync(resultPath)) {
        return [];
    }

    const result = fs.readFileSync(resultPath, 'utf8');
    const parsed = JSON.parse(result) as any[];

    console.log(`📊 Processing ALL ${parsed.length} OCSF items from ${resultPath}`);

    return parsed.map((item, index) => {
        const resource = item.resources?.[0] || {};

        const testResult: TestResultItem = {
            id: `${item.finding_info?.uid || 'unknown'}-${index}`,
            test_requirements: item.unmapped?.compliance?.['CCC-Objects'] || [],
            result: item.status_code === 'PASS' ? TestResultType.PASS :
                item.status_code === 'FAIL' ? TestResultType.FAIL : TestResultType.NA,
            name: item.finding_info?.title || 'Unknown Finding',
            message: item.message || '',
            test: item.metadata?.event_code || '',
            timestamp: item.finding_info?.created_time || Date.now(),
            further_info_url: item.unmapped?.related_url,
            resources: [resource.name || resource.uid || 'Unknown Resource'],
            // OCSF-specific fields
            status_code: item.status_code || 'UNKNOWN',
            status_detail: item.status_detail || '',
            resource_name: resource.name || resource.uid || 'Unknown Resource',
            resource_type: resource.type || 'Unknown Type',
            resource_uid: resource.uid,
            ccc_objects: item.unmapped?.compliance?.['CCC-Objects'] || [],
            finding_title: item.finding_info?.title || 'Unknown Finding',
            finding_uid: item.finding_info?.uid || ''
        };

        return testResult;
    });
}


async function createConfiguration(configDir: string, slug: string, repositoryData: any, createData: (name: string, data: string | object) => Promise<string>, addRoute: (route: any) => void): Promise<Configuration> {
    console.log(`🔍 Processing configuration directory: ${configDir}`);

    // Read the configuration file
    const configPath = path.join(configDir, 'config', `${path.basename(configDir)}.json`);
    console.log(`📁 Config path: ${configPath}`);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as CFIConfigJson;

    // Process OCSF results if they exist
    const resultsDir = path.join(configDir, 'results');
    let testResults: TestResultItem[] = [];
    let allOcsfResults: TestResultItem[] = [];

    if (fs.existsSync(resultsDir)) {
        const resultFiles = fs.readdirSync(resultsDir).filter(f => f.endsWith('_ocsf.json'));
        console.log(`Found ${resultFiles.length} OCSF result files in ${resultsDir}`);

        for (const resultFile of resultFiles) {
            const resultPath = path.join(resultsDir, resultFile);
            const fileResults = processOCSFResults(resultPath);
            const allFileResults = processAllOCSFResults(resultPath);
            testResults.push(...fileResults);
            allOcsfResults.push(...allFileResults);
        }

        console.log(`📊 Configuration ${config.id}: processed ${testResults.length} OCSF results with CCC-Objects and ${allOcsfResults.length} total OCSF results`);
    }

    // Create configuration with repository info and test results
    const configuration: Configuration = {
        cfi_details: config,
        repository: repositoryData,
        slug,
        test_results: testResults,
        all_ocsf_results: allOcsfResults
    };

    // Create configuration page data
    const pageData: ConfigurationPageData = {
        configuration
    };

    const jsonPath = await createData(
        `cfi-config-${config.id}.json`,
        JSON.stringify(pageData, null, 2)
    );

    // Add route for this configuration page
    addRoute({
        path: slug,
        component: '@site/src/components/cfi/Configuration/index.tsx',
        modules: {
            pageData: jsonPath,
        },
        exact: true,
    });

    console.log(`✅ Created configuration page for ${configuration.cfi_details.id} at ${slug}`);
    return configuration;
}


export default function pluginCFIPages(_: LoadContext): Plugin<void> {
    return {
        name: 'cfi-pages',

        async contentLoaded({ actions }) {
            const { createData, addRoute } = actions;

            const testResultsDir = path.resolve(__dirname, '../../data/test-results');

            // Find all repository directories and their configurations
            const allDirs = fs.readdirSync(testResultsDir);
            console.log(`All directories in test-results:`, allDirs);

            const components: Configuration[] = [];

            for (const repoDir of allDirs) {
                const repoPath = path.join(testResultsDir, repoDir);
                const repositoryJsonPath = path.join(repoPath, 'repository.json');

                if (!fs.existsSync(repositoryJsonPath)) {
                    console.log(`No repository.json found in ${repoDir}, skipping`);
                    continue;
                }

                console.log(`Processing repository: ${repoDir}`);

                // Read repository info
                const repositoryData = JSON.parse(fs.readFileSync(repositoryJsonPath, 'utf8'));

                // Find all configuration directories within this repository
                const configDirs = fs.readdirSync(repoPath).filter(dir => {
                    const configPath = path.join(repoPath, dir, 'config');
                    return fs.existsSync(configPath) && fs.statSync(configPath).isDirectory();
                });

                console.log(`Found ${configDirs.length} configurations in ${repoDir}:`, configDirs);

                const repositoryConfigurations: Configuration[] = [];

                for (const configDir of configDirs) {
                    const slug = '/cfi/' + repoDir + '/' + configDir;
                    const fullConfigDir = path.join(repoPath, configDir);

                    try {
                        const configuration = await createConfiguration(fullConfigDir, slug, repositoryData, createData, addRoute);
                        components.push(configuration);
                        repositoryConfigurations.push(configuration);
                    } catch (error) {
                        console.error(`Error processing configuration ${configDir} in ${repoDir}:`, error);
                    }
                }

                // Create repository page
                if (repositoryConfigurations.length > 0) {
                    const repositoryPageData: RepositoryPageData = {
                        repository: repositoryData,
                        configurations: repositoryConfigurations,
                        repositorySlug: repoDir
                    };

                    const repositoryPagePath = await createData(
                        `cfi-repository-${repoDir}.json`,
                        JSON.stringify(repositoryPageData, null, 2)
                    );

                    addRoute({
                        path: `/cfi/${repoDir}`,
                        component: '@site/src/components/cfi/Repository/index.tsx',
                        modules: {
                            pageData: repositoryPagePath,
                        },
                        exact: true,
                    });

                    console.log(`✅ Created repository page for ${repoDir} at /cfi/${repoDir}`);
                }
            }

            // Create home page data
            const homePageData: HomePageData = {
                configurations: components
            };

            const homePagePath = await createData(
                'cfi-home.json',
                JSON.stringify(homePageData, null, 2)
            );

            addRoute({
                path: '/cfi',
                component: '@site/src/components/cfi/Home/index.tsx',
                modules: {
                    pageData: homePagePath,
                },
                exact: true,
            });

            console.log('Added route for /cfi');
        },
    };
}
