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
            }
        },
    };
}
