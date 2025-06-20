import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { LoadContext, Plugin } from '@docusaurus/types';
import { HomePageData, Configuration, ConfigurationPageData, TestResultItem, TestResultPageData, TestResultType, TestResultEntry } from '../../types/cfi';

export interface CCIReferenceYaml {
    id: string;
}

export interface CFIReleaseYaml {
    ccc_references: CCIReferenceYaml[];

    cfi_details: {
        id: string;
        provider: string;
        name: string;
        description: string;
        url: string;
        authors: Array<{
            name: string;
            github_id: string;
            company: string;
        }>;
    };

    terraform: {
        source: string;
        script: string;
    };
    results: string[];
    resources: string[];
}

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
    const dataFile = path.resolve(__dirname, '../../data/test-results/' + resultPath);

    const result = fs.readFileSync(dataFile, 'utf8');
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

function createConfiguration(parsed: CFIReleaseYaml, slug: string): Configuration {
    return {
        cfi_details: parsed.cfi_details,
        ccc_references: parsed.ccc_references.map(r => r.id),
        terraform: parsed.terraform,
        test_results: [],
        slug,
        resources: parsed.resources
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

async function createResultPage(result: string, configuration: Configuration, createData: (name: string, data: string | object) => Promise<string>, addRoute: (route: any) => void): Promise<TestResultEntry> {
    const resultName = path.basename(result).replace('.ocsf.json', '').replace('test-results/', '');
    const slug = configuration.slug + "/" + resultName
    const resultPage: TestResultPageData = {
        slug,
        result_name: resultName,
        result_path: result,
        releaseTitle: configuration.cfi_details.name,
        configuration,
        results: createTestResultData(result, configuration.resources, configuration.ccc_references),
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

async function createConfigurationPage(parsed: CFIReleaseYaml, slug: string, createData: (name: string, data: string | object) => Promise<string>, addRoute: (route: any) => void): Promise<Configuration> {
    const configuration: Configuration = createConfiguration(parsed, slug)

    // Create pages for each test result
    for (const result of parsed['results']) {
        const resultEntry = await createResultPage(result, configuration, createData, addRoute)
        configuration.test_results.push(resultEntry)
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

            const dataDir = path.resolve(__dirname, '../../data/cfi-configurations');
            const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.yaml'));

            // Group releases by CCC ID
            const components: Configuration[] = [];

            for (const file of files) {
                const slug = '/cfi/' + file.replace(/\.yaml$/, '');
                const filePath = path.join(dataDir, file);
                const raw = fs.readFileSync(filePath, 'utf8');
                const parsed = yaml.load(raw) as CFIReleaseYaml;
                components.push(await createConfigurationPage(parsed, slug, createData, addRoute))
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
