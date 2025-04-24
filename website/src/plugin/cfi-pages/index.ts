import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { LoadContext, Plugin } from '@docusaurus/types';

interface CFIReleaseYaml {
    ccc: {
        version: string;
        id: string;
    };
    cfi_details: {
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
    'result-runs': string[];
}

export default function pluginCFIPages(_: LoadContext): Plugin<void> {
    return {
        name: 'cfi-pages',

        async contentLoaded({ actions }) {
            const { createData, addRoute } = actions;

            const dataDir = path.resolve(__dirname, '../../data/cfi-releases');
            const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.yaml'));

            // Group releases by CCC ID
            const components: Record<string, any[]> = {};

            for (const file of files) {
                const slug = file.replace(/\.yaml$/, '');
                const filePath = path.join(dataDir, file);
                const raw = fs.readFileSync(filePath, 'utf8');
                const parsed = yaml.load(raw) as CFIReleaseYaml;

                const cccId = parsed.ccc.id;
                if (!components[cccId]) {
                    components[cccId] = [];
                }

                components[cccId].push({
                    id: parsed.ccc.id,
                    title: parsed.cfi_details.name,
                    slug,
                    version: parsed.ccc.version,
                    authors: parsed.cfi_details.authors.map(author => ({
                        name: author.name,
                        githubId: author.github_id,
                        company: author.company
                    })),
                    description: parsed.cfi_details.description,
                    url: parsed.cfi_details.url,
                    ccc_reference: {
                        version: parsed.ccc.version,
                        id: parsed.ccc.id,
                        link: `/ccc/${parsed.ccc.id}`
                    },
                    terraform: {
                        source: parsed.terraform.source,
                        script: parsed.terraform.script
                    },
                    test_results: parsed['result-runs'].map(result => ({
                        path: result,
                        name: path.basename(result)
                    })),
                    link: `/cfi/${slug}`
                });

                const pageData = {
                    slug,
                    metadata: parsed.cfi_details,
                    ccc_reference: parsed.ccc,
                    terraform: parsed.terraform,
                    test_results: parsed['result-runs']
                };

                const jsonPath = await createData(
                    `cfi-${slug}.json`,
                    JSON.stringify(pageData, null, 2)
                );

                addRoute({
                    path: `/cfi/${slug}`,
                    component: '@site/src/components/cfi/Release/index.tsx',
                    modules: {
                        pageData: jsonPath,
                    },
                    exact: true,
                });

                console.log(`Added route for ${slug}`);

                // Create pages for each test result
                for (const result of parsed['result-runs']) {
                    const resultName = path.basename(result);
                    const resultPagePath = await createData(
                        `cfi-${slug}-${resultName}.json`,
                        JSON.stringify({
                            slug,
                            result_name: resultName,
                            result_path: result,
                            releaseTitle: parsed.cfi_details.name,
                            ccc_reference: parsed.ccc
                        }, null, 2)
                    );

                    addRoute({
                        path: `/cfi/${slug}/results/${resultName}`,
                        component: '@site/src/components/cfi/TestResult/index.tsx',
                        modules: {
                            pageData: resultPagePath,
                        },
                        exact: true,
                    });

                    console.log(`Added route for /cfi/${slug}/results/${resultName}`);
                }
            }

            // Create home page data
            const homePageData = {
                components: Object.entries(components).map(([cccId, releases]) => ({
                    title: cccId,
                    releases: releases.sort((a, b) => b.version.localeCompare(a.version))
                }))
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
