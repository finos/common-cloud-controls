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

type PluginContent = CCCReleaseYaml[];

export default function pluginCCCPages(_: LoadContext): Plugin<PluginContent> {
    return {
        name: 'ccc-pages',

        async loadContent(): Promise<PluginContent> {
            const dataDir = path.resolve(__dirname, '../../data/ccc-releases');
            const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.yaml'));

            const releases: CCCReleaseYaml[] = [];

            for (const file of files) {
                const filePath = path.join(dataDir, file);
                const raw = fs.readFileSync(filePath, 'utf8');
                const parsed = yaml.load(raw) as CCCReleaseYaml;
                releases.push(parsed);
            }

            return releases;
        },

        async contentLoaded({ actions, content }) {
            const { createData, addRoute } = actions;
            const cccReleases = content as PluginContent;

            // Group releases by component
            const components: Record<string, any[]> = {};

            for (const parsed of cccReleases) {
                const slug = `${parsed.metadata.id}_${parsed.metadata.release_details[0]?.version || 'N/A'}`;

                const componentTitle = parsed.metadata.title;
                if (!components[componentTitle]) {
                    components[componentTitle] = [];
                }

                components[componentTitle].push({
                    id: parsed.metadata.id,
                    title: parsed.metadata.title,
                    slug,
                    version: parsed.metadata.release_details[0]?.version || 'N/A',
                    release_manager: {
                        name: parsed.metadata.release_details[0]?.release_manager?.name || 'N/A',
                        githubId: parsed.metadata.release_details[0]?.release_manager?.github_id || 'N/A',
                        company: parsed.metadata.release_details[0]?.release_manager?.company || 'N/A',
                        avatarUrl: parsed.metadata.release_details[0]?.release_manager?.avatarUrl
                    },
                    authors: parsed.metadata.release_details[0]?.contributors?.map(c => c.name) || [],
                    controls_count: parsed.controls.length,
                    threats_count: parsed.threats?.length || 0,
                    features_count: parsed.features?.length || 0,
                    link: `/ccc/${slug}`
                });

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
                    // Find the full threat objects for this control
                    const fullThreats = control.threats?.map(threatId =>
                        parsed.threats.find(t => t.id === threatId)
                    ).filter(Boolean) || [];

                    const controlPagePath = await createData(
                        `ccc-${slug}-${control.id}.json`,
                        JSON.stringify({
                            slug,
                            control: {
                                ...control,
                                threats: fullThreats
                            },
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
                    // Find all controls that reference this feature
                    const relatedControls = parsed.controls.filter(control =>
                        control.features?.includes(feature.id)
                    ).map(control => ({
                        id: control.id,
                        title: control.title,
                        link: control.link
                    }));

                    // Find all threats that reference this feature
                    const relatedThreats = parsed.threats.filter(threat =>
                        threat.features?.includes(feature.id)
                    ).map(threat => ({
                        id: threat.id,
                        title: threat.title,
                        description: threat.description,
                        link: threat.link
                    }));

                    const featurePagePath = await createData(
                        `ccc-${slug}-${feature.id}.json`,
                        JSON.stringify({
                            slug,
                            feature: {
                                ...feature,
                                relatedControls,
                                relatedThreats
                            },
                            releaseTitle: parsed.metadata.title,
                            releaseId: parsed.metadata.id,
                        }, null, 2)
                    );

                    addRoute({
                        path: `/ccc/${slug}/${feature.id}`,
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
                    // Find all controls that reference this threat
                    const relatedControls = parsed.controls.filter(control =>
                        control.threats?.includes(threat.id)
                    ).map(control => ({
                        id: control.id,
                        title: control.title,
                        link: control.link
                    }));

                    // Find all features that this threat references
                    const relatedFeatures = threat.features?.map(featureId =>
                        parsed.features.find(f => f.id === featureId)
                    ).filter(Boolean).map(feature => ({
                        id: feature.id,
                        title: feature.title,
                        description: feature.description,
                        link: feature.link
                    })) || [];

                    const threatPagePath = await createData(
                        `ccc-${slug}-${threat.id}.json`,
                        JSON.stringify({
                            slug,
                            threat: {
                                ...threat,
                                relatedControls,
                                relatedFeatures
                            },
                            releaseTitle: parsed.metadata.title,
                            releaseId: parsed.metadata.id,
                        }, null, 2)
                    );

                    addRoute({
                        path: `/ccc/${slug}/${threat.id}`,
                        component: '@site/src/components/ccc/Threat/index.tsx',
                        modules: {
                            pageData: threatPagePath,
                        },
                        exact: true,
                    });

                    console.log(`Added route for /ccc/${slug}/${threat.link}`);
                }
            }

            // Create home page data
            const homePageData = {
                components: Object.entries(components).map(([title, releases]) => ({
                    title,
                    releases: releases.sort((a, b) => b.version.localeCompare(a.version))
                }))
            };

            const homePagePath = await createData(
                'ccc-home.json',
                JSON.stringify(homePageData, null, 2)
            );

            addRoute({
                path: '/ccc',
                component: '@site/src/components/ccc/Home/index.tsx',
                modules: {
                    pageData: homePagePath,
                },
                exact: true,
            });

            console.log('Added route for /ccc');
        },
    };
}
