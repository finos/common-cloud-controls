import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { LoadContext, Plugin } from '@docusaurus/types';

interface CCCReleaseYaml {
    metadata: {
        title: string;
        id: string;
        description: string;
        release_details: any[];
    };
    controls: any[];
    features: any[];
    threats: any[];
}

export default function pluginCCCPages(_: LoadContext): Plugin<void> {
    return {
        name: 'ccc-pages',

        async contentLoaded({ actions }) {
            const { createData, addRoute } = actions;

            const dataDir = path.resolve(__dirname, '../../data/ccc-releases');
            const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.yaml'));

            for (const file of files) {
                const slug = file.replace(/\.yaml$/, '');
                const filePath = path.join(dataDir, file);
                const raw = fs.readFileSync(filePath, 'utf8');
                const parsed = yaml.load(raw) as CCCReleaseYaml;

                const pageData = {
                    slug,
                    metadata: parsed.metadata,
                    controls: parsed.controls,
                    features: parsed.features || [],
                    threats: parsed.threats || [],
                };

                const jsonPath = await createData(
                    `ccc-${slug}.json`,
                    JSON.stringify(pageData, null, 2)
                );

                addRoute({
                    path: `/ccc/${slug}`,
                    component: '@site/src/components/ccc/Release/index.tsx',
                    modules: {
                        pageData: jsonPath,
                    },
                    exact: true,
                });

                console.log(`Added route for ${slug}`);

                // Create one page per control
                for (const control of parsed.controls) {
                    const controlPagePath = await createData(
                        `ccc-${slug}-${control.id}.json`,
                        JSON.stringify({
                            slug,
                            control,
                            releaseTitle: parsed.metadata.title,
                            releaseId: parsed.metadata.id,
                        }, null, 2)
                    );

                    addRoute({
                        path: `/ccc/${slug}/${control.id}`,
                        component: '@site/src/components/ccc/Control/index.tsx',
                        modules: {
                            pageData: controlPagePath,
                        },
                        exact: true,
                    });

                    console.log(`Added route for /ccc/${slug}/${control.id}`);

                }

                // Create one page per feature
                for (const feature of parsed.features || []) {
                    const featurePagePath = await createData(
                        `ccc-${slug}-${feature.id}.json`,
                        JSON.stringify({
                            slug,
                            feature,
                            releaseTitle: parsed.metadata.title,
                            releaseId: parsed.metadata.id,
                        }, null, 2)
                    );

                    addRoute({
                        path: `/ccc/${slug}/${feature.link}`,
                        component: '@site/src/components/ccc/Feature/index.tsx',
                        modules: {
                            pageData: featurePagePath,
                        },
                        exact: true,
                    });

                    console.log(`Added route for /ccc/${slug}/${feature.link}`);
                }

                // Create one page per threat
                for (const threat of parsed.threats || []) {
                    const threatPagePath = await createData(
                        `ccc-${slug}-${threat.id}.json`,
                        JSON.stringify({
                            slug,
                            threat,
                            releaseTitle: parsed.metadata.title,
                            releaseId: parsed.metadata.id,
                        }, null, 2)
                    );

                    addRoute({
                        path: `/ccc/${slug}/${threat.link}`,
                        component: '@site/src/components/ccc/Threat/index.tsx',
                        modules: {
                            pageData: threatPagePath,
                        },
                        exact: true,
                    });

                    console.log(`Added route for /ccc/${slug}/${threat.link}`);
                }
            }
        },
    };
}
