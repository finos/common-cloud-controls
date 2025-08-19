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

    const statusCodeToResultType: Record<string, TestResultType> = {
        'pass': TestResultType.PASS,
        'fail': TestResultType.FAIL
    };

    return parsed.flatMap(item => {
        const complianceIds = getComplianceIds(item, ccc_references)
        const unfilteredResources = item.resources.map((r: any) => r.uid) || []
        const filteredResources = unfilteredResources.filter((r: string) => matchesAnySubstring(r, resources))

        if (filteredResources.length > 0) {
            const result = statusCodeToResultType[item.status_code?.toLowerCase()] || TestResultType.NA;
            return complianceIds.map((id: string) => {
                const out: TestResultItem = {
                    id: item.finding_info.uid + "_" + id,
                    test_requirement_id: id,
                    test: item.metadata?.event_code || '',
                    result: result,
                    name: item.finding_info.title,
                    message: item.status_detail || '',
                    timestamp: item.time,
                    resources: filteredResources,
                    further_info_url: item.unmapped.related_url
                }
                return out;
            });
        } else {
            return []
        }
    });
}

function createConfiguration(config: CFIConfigJson, slug: string): Configuration {
    // Add URL if not present
    const configWithUrl = {
        ...config,
        url: config.url || `https://github.com/robmoffat/cfi-s3-module` // TODO: make this dynamic
    };

    return {
        cfi_details: configWithUrl,
        ccc_references: config.specifications,
        test_results: [],
        slug,
        resources: config.resources
    }
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
        results: createTestResultData(resultPath, configuration.resources, configuration.ccc_references),
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
        date: new Date(resultPage.results[0].timestamp).toISOString(),
        status: aggregateResultStatus(resultPage.results),
        slug
    }
}

async function createConfigurationPage(config: CFIConfigJson, slug: string, createData: (name: string, data: string | object) => Promise<string>, addRoute: (route: any) => void): Promise<Configuration> {
    const configuration: Configuration = createConfiguration(config, slug)

    // Find the results directory for this configuration
    const testResultsDir = path.resolve(__dirname, '../../data/test-results');
    const configDirs = fs.readdirSync(testResultsDir)
        .filter(dir => dir.startsWith(`cfi-results-${config.id}-`))
        .sort((a, b) => b.localeCompare(a)); // Sort by timestamp, newest first

    if (configDirs.length > 0) {
        const latestDir = configDirs[0];
        const resultsDir = path.join(testResultsDir, latestDir, 'results');

        if (fs.existsSync(resultsDir)) {
            const resultFiles = fs.readdirSync(resultsDir).filter(f => f.endsWith('.ocsf.json'));

            // Create pages for each test result
            for (const resultFile of resultFiles) {
                const resultPath = path.join(resultsDir, resultFile);
                const resultEntry = await createResultPage(resultPath, configuration, createData, addRoute)
                configuration.test_results.push(resultEntry)
            }
        }
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
            const configDirs = fs.readdirSync(testResultsDir)
                .filter(dir => dir.startsWith('cfi-results-'))
                .map(dir => {
                    const match = dir.match(/cfi-results-([^-]+)-/);
                    return match ? match[1] : null;
                })
                .filter(Boolean)
                .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

            // Group releases by configuration ID
            const components: Configuration[] = [];

            for (const configId of configDirs) {
                const slug = '/cfi/' + configId;

                // Find the latest config file for this configuration
                const configDirsForId = fs.readdirSync(testResultsDir)
                    .filter(dir => dir.startsWith(`cfi-results-${configId}-`))
                    .sort((a, b) => b.localeCompare(a)); // Sort by timestamp, newest first

                if (configDirsForId.length > 0) {
                    const latestDir = configDirsForId[0];
                    const configPath = path.join(testResultsDir, latestDir, 'config', `${configId}.json`);

                    if (fs.existsSync(configPath)) {
                        const raw = fs.readFileSync(configPath, 'utf8');
                        const config = JSON.parse(raw) as CFIConfigJson;
                        components.push(await createConfigurationPage(config, slug, createData, addRoute))
                    }
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
