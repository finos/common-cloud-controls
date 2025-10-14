import fs from 'fs';
import path from 'path';
import type { LoadContext, Plugin } from '@docusaurus/types';
import { HomePageData, Configuration, ConfigurationPageData, RepositoryPageData, CFIConfigJson, TestResultItem, TestResultType, CFIRepository, ConfigurationResult, ConfigurationResultPageData, ConfigurationResultSummary } from '../../types/cfi';

function processOCSFResults(resultPath: string): TestResultItem[] {
    if (!fs.existsSync(resultPath)) {
        return [];
    }

    const result = fs.readFileSync(resultPath, 'utf8');
    const parsed = JSON.parse(result) as any[];

    console.log(`📊 Processing ${parsed.length} OCSF items from ${resultPath}`);

    return parsed
        .filter(item => {
            // Only include items that have CCC in compliance
            return item.unmapped?.compliance?.['CCC'] &&
                Array.isArray(item.unmapped.compliance['CCC']) &&
                item.unmapped.compliance['CCC'].length > 0;
        })
        .map((item, index) => {
            const resource = item.resources?.[0] || {};

            const testResult: TestResultItem = {
                id: `${item.finding_info?.uid || 'unknown'}-${index}`,
                test_requirements: item.unmapped.compliance['CCC'],
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
                ccc_objects: item.unmapped.compliance['CCC'],
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
            test_requirements: item.unmapped?.compliance?.['CCC'] || [],
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
            ccc_objects: item.unmapped?.compliance?.['CCC'] || [],
            finding_title: item.finding_info?.title || 'Unknown Finding',
            finding_uid: item.finding_info?.uid || ''
        };

        return testResult;
    });
}

/**
 * Process all OCSF results and partition them by product, vendor, and version
 */
function partitionOCSFResultsByMetadata(resultsDir: string): Map<string, ConfigurationResult> {
    const partitionMap = new Map<string, ConfigurationResult>();

    if (!fs.existsSync(resultsDir)) {
        return partitionMap;
    }

    const resultFiles = fs.readdirSync(resultsDir).filter(f => f.endsWith('ocsf.json'));
    console.log(`📂 Found ${resultFiles.length} OCSF result files in ${resultsDir}`);

    for (const resultFile of resultFiles) {
        const resultPath = path.join(resultsDir, resultFile);
        const result = fs.readFileSync(resultPath, 'utf8');
        const parsed = JSON.parse(result) as any[];

        console.log(`📊 Partitioning ${parsed.length} OCSF items from ${resultFile}`);

        parsed.forEach((item, index) => {
            // Extract metadata
            const product = item.metadata?.product?.name || 'Unknown Product';
            const vendor = item.metadata?.product?.vendor_name || 'Unknown Vendor';
            const version = item.metadata?.product?.version || 'Unknown Version';

            // Create unique key for this combination
            const key = `${vendor}::${product}::${version}`;

            // Initialize partition if it doesn't exist
            if (!partitionMap.has(key)) {
                partitionMap.set(key, {
                    product,
                    vendor,
                    version,
                    test_results: []
                });
            }

            // Convert OCSF item to TestResultItem
            const resource = item.resources?.[0] || {};
            const testResult: TestResultItem = {
                id: `${item.finding_info?.uid || 'unknown'}-${index}`,
                test_requirements: item.unmapped?.compliance?.['CCC'] || [],
                result: item.status_code === 'PASS' ? TestResultType.PASS :
                    item.status_code === 'FAIL' ? TestResultType.FAIL : TestResultType.NA,
                name: item.finding_info?.title || 'Unknown Finding',
                message: item.message || '',
                test: item.metadata?.event_code || '',
                timestamp: item.finding_info?.created_time || Date.now(),
                further_info_url: item.unmapped?.related_url,
                resources: [resource.name || resource.uid || 'Unknown Resource'],
                status_code: item.status_code || 'UNKNOWN',
                status_detail: item.status_detail || '',
                resource_name: resource.name || resource.uid || 'Unknown Resource',
                resource_type: resource.type || 'Unknown Type',
                resource_uid: resource.uid,
                ccc_objects: item.unmapped?.compliance?.['CCC'] || [],
                finding_title: item.finding_info?.title || 'Unknown Finding',
                finding_uid: item.finding_info?.uid || ''
            };

            partitionMap.get(key)!.test_results.push(testResult);
        });
    }

    return partitionMap;
}


async function createConfiguration(configDir: string, slug: string, repositoryData: CFIRepository, createData: (name: string, data: string | object) => Promise<string>, addRoute: (route: any) => void): Promise<Configuration> {
    console.log(`🔍 Processing configuration directory: ${configDir}`);

    // Read the configuration file
    const configPath = path.join(configDir, 'config', `${path.basename(configDir)}.json`);
    console.log(`📁 Config path: ${configPath}`);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as CFIConfigJson;

    // Process OCSF results and partition by product, vendor, version
    const resultsDir = path.join(configDir, 'results');
    const partitionedResults = partitionOCSFResultsByMetadata(resultsDir);

    console.log(`📊 Configuration ${config.id}: found ${partitionedResults.size} unique product/vendor/version combinations`);

    // Convert partitioned results to array
    const configurationResults: ConfigurationResult[] = Array.from(partitionedResults.values());

    // Create ConfigurationResultSummary for each result
    const configurationResultSummaries: ConfigurationResultSummary[] = [];

    // Create a page for each ConfigurationResult
    for (const configResult of configurationResults) {
        // Generate a slug-friendly key
        const resultKey = `${configResult.vendor}-${configResult.product}-${configResult.version}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-');

        const resultSlug = `${slug}/${resultKey}`;

        // Calculate summary statistics
        const totalTests = configResult.test_results.length;
        const passingTests = configResult.test_results.filter(r => r.status_code === 'PASS').length;
        const failingTests = configResult.test_results.filter(r => r.status_code === 'FAIL').length;

        // Add to summaries
        configurationResultSummaries.push({
            product: configResult.product,
            vendor: configResult.vendor,
            version: configResult.version,
            slug: resultSlug,
            totalTests,
            passingTests,
            failingTests
        });

        // Create temporary configuration for this result page
        const configuration: Configuration = {
            cfi_details: config,
            repository: repositoryData,
            slug,
            results: configurationResults,
        };

        // Create ConfigurationResult page data
        const resultPageData: ConfigurationResultPageData = {
            configuration,
            configurationResult: configResult
        };

        const resultJsonPath = await createData(
            `cfi-config-result-${repositoryData.name}-${config.id}-${resultKey}.json`,
            JSON.stringify(resultPageData, null, 2)
        );

        // Add route for this ConfigurationResult page
        addRoute({
            path: resultSlug,
            component: '@site/src/components/cfi/ConfigurationResult/index.tsx',
            modules: {
                pageData: resultJsonPath,
            },
            exact: true,
        });

        console.log(`✅ Created ConfigurationResult page at ${resultSlug} (${totalTests} tests)`);
    }

    // Create configuration with repository info and partitioned results
    const configuration: Configuration = {
        cfi_details: config,
        repository: repositoryData,
        slug,
        results: configurationResults,
    };

    // Create configuration page data
    const pageData: ConfigurationPageData = {
        configuration,
        configurationResultSummaries
    };

    const jsonPath = await createData(
        `cfi-config-${repositoryData.name}-${config.id}.json`,
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
                const repositoryData = JSON.parse(fs.readFileSync(repositoryJsonPath, 'utf8')) as CFIRepository;

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
