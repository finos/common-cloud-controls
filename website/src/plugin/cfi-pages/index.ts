import fs from 'fs';
import path from 'path';
import type { LoadContext, Plugin } from '@docusaurus/types';
import { HomePageData, Configuration, ConfigurationPageData, TestResultItem, TestResultPageData, TestResultType, TestResultEntry, CFIConfigJson } from '../../types/cfi';



function matchesAnySubstring(str: string, substrings: string[]): boolean {
    return substrings.some(substring => str.includes(substring));
}

function getComplianceIds(item: any, ccc_references: string[]): string[] {
    const out = []
    if (item.unmapped?.compliance) {
        const entries: { [key: string]: string[] } = item.unmapped.compliance
        for (const [key, value] of Object.entries(entries)) {
            if (matchesAnySubstring(key, ccc_references)) {
                out.push(...value)
            }
        }
    }
    return out
}

function createTestResultData(resultPath: string, resources: string[], ccc_references: string[]): TestResultItem[] {
    // resultPath is now the full absolute path to the result file
    const result = fs.readFileSync(resultPath, 'utf8');
    const parsed = JSON.parse(result) as any[];

    console.log(`📊 Processing ${parsed.length} OCSF items from ${resultPath}`);
    console.log(`🔍 Looking for resources matching:`, resources);
    console.log(`🔍 Looking for compliance IDs matching:`, ccc_references);

    const statusCodeToResultType: Record<string, TestResultType> = {
        'pass': TestResultType.PASS,
        'fail': TestResultType.FAIL
    };

    return parsed.flatMap(item => {
        const complianceIds = getComplianceIds(item, ccc_references)
        console.log(`📋 Item ${item.finding_info?.uid || 'unknown'}: found ${complianceIds.length} compliance IDs`);

        // Handle new OCSF format - resources might have different structure
        let unfilteredResources: string[] = [];
        if (item.resources && Array.isArray(item.resources)) {
            unfilteredResources = item.resources.map((r: any) => {
                // Try different possible resource ID fields
                return r.uid || r.id || r.name || '';
            }).filter(Boolean);
        }

        console.log(`🔍 Item resources:`, unfilteredResources);
        const filteredResources = unfilteredResources.filter((r: string) => matchesAnySubstring(r, resources))
        console.log(`✅ Filtered resources:`, filteredResources);

        if (filteredResources.length > 0) {
            const result = statusCodeToResultType[item.status_code?.toLowerCase()] || TestResultType.NA;
            return complianceIds.map((id: string) => {
                const out: TestResultItem = {
                    id: item.finding_info?.uid + "_" + id,
                    test_requirement_id: id,
                    test: item.metadata?.event_code || '',
                    result: result,
                    name: item.finding_info?.title || item.title || 'Unknown',
                    message: item.status_detail || item.message || '',
                    timestamp: item.finding_info?.created_time || item.time || Date.now(),
                    resources: filteredResources,
                    further_info_url: item.unmapped?.related_url
                }
                return out;
            });
        } else {
            console.log(`❌ No matching resources found for item ${item.finding_info?.uid || 'unknown'}`);
            return []
        }
    });
}



function aggregateResultStatus(results: TestResultItem[]): TestResultType {
    return results.reduce((acc, result) => {
        if (result.result === TestResultType.FAIL) {
            return TestResultType.FAIL;
        }
        return acc;
    }, TestResultType.PASS);
}

async function createResultPage(resultPath: string, configuration: Configuration, createData: (name: string, data: string | object) => Promise<string>, addRoute: (route: any) => void): Promise<TestResultEntry> {
    const resultName = path.basename(resultPath).replace('.ocsf.json', '');
    const slug = configuration.slug + "/" + resultName
    const resultPage: TestResultPageData = {
        slug,
        result_name: resultName,
        result_path: resultPath,
        releaseTitle: configuration.cfi_details.name,
        configuration,
        results: createTestResultData(resultPath, configuration.cfi_details.resources, configuration.ccc_references),
        parentSlug: configuration.slug
    }

    const resultPagePath = await createData(
        `cfi-${slug}-${resultName}.json`,
        JSON.stringify(resultPage, null, 2)
    );

    addRoute({
        path: slug,
        component: '@site/src/components/cfi/TestResult/index.tsx',
        modules: {
            pageData: resultPagePath,
        },
        exact: true,
    });

    console.log(`Added route for ${slug}`);

    return {
        id: resultName,
        date: resultPage.results.length > 0 ? new Date(resultPage.results[0].timestamp).toISOString() : new Date().toISOString(),
        status: resultPage.results.length > 0 ? aggregateResultStatus(resultPage.results) : TestResultType.NA,
        slug
    }
}

async function createConfigurationPage(configDir: string, slug: string, createData: (name: string, data: string | object) => Promise<string>, addRoute: (route: any) => void): Promise<Configuration> {
    console.log(`🔍 Processing configuration directory: ${configDir}`);

    // Read the repository.json file to get repository info
    const repositoryPath = path.join(configDir, 'config', 'repository.json');
    console.log(`📁 Repository path: ${repositoryPath}`);
    const repositoryData = JSON.parse(fs.readFileSync(repositoryPath, 'utf8'));

    // Read the configuration file
    const configPath = path.join(configDir, 'config', `${path.basename(configDir)}.json`);
    console.log(`📁 Config path: ${configPath}`);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as CFIConfigJson;

    // Create configuration with repository info
    const configuration: Configuration = {
        cfi_details: config,
        repository: repositoryData,
        ccc_references: config.specifications,
        test_results: [],
        slug
    };

    // Find the results directory for this configuration
    const resultsDir = path.join(configDir, 'results');
    console.log(`Looking for results in: ${resultsDir}`);

    if (fs.existsSync(resultsDir)) {
        const allFiles = fs.readdirSync(resultsDir);
        console.log(`All files in results directory:`, allFiles);

        const resultFiles = allFiles.filter(f => f.endsWith('_ocsf.json'));
        console.log(`Found ${resultFiles.length} result files in ${resultsDir}:`, resultFiles);

        // Process test results but don't create separate pages
        let totalFindings = 0;
        for (const resultFile of resultFiles) {
            const resultPath = path.join(resultsDir, resultFile);
            console.log(`Processing result file: ${resultPath}`);

            // Create a result entry with actual test data
            const testData = createTestResultData(resultPath, configuration.cfi_details.resources, configuration.ccc_references);

            if (testData.length > 0) {
                const resultEntry: TestResultEntry = {
                    id: path.basename(resultFile, '_ocsf.json'),
                    date: new Date(testData[0].timestamp).toISOString(),
                    status: aggregateResultStatus(testData),
                    slug: configuration.slug + "/" + path.basename(resultFile, '_ocsf.json')
                };

                // Store the actual test data for display
                (resultEntry as any).testData = testData;

                configuration.test_results.push(resultEntry)
                totalFindings += testData.length;
            }
        }

        console.log(`📊 Configuration ${configuration.cfi_details.id}: ${configuration.test_results.length} test result files with ${totalFindings} total findings`);
    } else {
        console.log(`Results directory does not exist: ${resultsDir}`);
    }

    // create release page 
    const pageData: ConfigurationPageData = {
        configuration
    };

    const jsonPath = await createData(
        `cfi-${slug}.json`,
        JSON.stringify(pageData, null, 2)
    );

    addRoute({
        path: slug,
        component: '@site/src/components/cfi/Configuration/index.tsx',
        modules: {
            pageData: jsonPath,
        },
        exact: true,
    });

    console.log(`Added route for ${slug}`);

    return configuration
}


export default function pluginCFIPages(_: LoadContext): Plugin<void> {
    return {
        name: 'cfi-pages',

        async contentLoaded({ actions }) {
            const { createData, addRoute } = actions;

            const testResultsDir = path.resolve(__dirname, '../../data/test-results');

            // Find all directories that contain a repository.json file
            const allDirs = fs.readdirSync(testResultsDir);
            console.log(`All directories in test-results:`, allDirs);

            const configDirs = allDirs.filter(dir => {
                const repositoryPath = path.join(testResultsDir, dir, 'config', 'repository.json');
                const exists = fs.existsSync(repositoryPath);
                console.log(`Checking ${dir}: ${repositoryPath} exists = ${exists}`);
                return exists;
            });

            console.log(`Found ${configDirs.length} configuration directories with repository.json files:`, configDirs);

            // Group releases by configuration ID
            const components: Configuration[] = [];

            for (const configDir of configDirs) {
                const slug = '/cfi/' + configDir;
                const fullConfigDir = path.join(testResultsDir, configDir);

                try {
                    const configuration = await createConfigurationPage(fullConfigDir, slug, createData, addRoute);
                    components.push(configuration);
                } catch (error) {
                    console.error(`Error processing configuration in ${configDir}:`, error);
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
