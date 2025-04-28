import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { LoadContext, Plugin } from '@docusaurus/types';
import { Release, Control, Feature, ReleasePageData, Threat, ControlPageData, FeaturePageData, ThreatPageData, HomePageData } from '@site/src/types/ccc';

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

function parseRelease(parsed: CCCReleaseYaml): Release {
    const slug = `/ccc/${parsed.metadata.id}.${parsed.metadata.release_details[0]?.version || 'N/A'}`;
    return {
        metadata: parsed.metadata,
        threats: parsed.threats.map(threat => parseThreat(threat, slug)),
        features: parsed.features.map(feature => parseFeature(feature, slug)),
        controls: parsed.controls.map(control => parseControl(control, slug)),
        slug,
    };
}

function parseThreat(threat: any, slug: string): Threat {
    return {
        ...threat,
        slug: slug + "/" + threat.id,
    };
}

function parseFeature(feature: any, slug: string): Feature {
    return {
        ...feature,
        slug: slug + "/" + feature.id,
    };
}

function parseControl(control: any, slug: string): Control {
    return {
        ...control,
        slug: slug + "/" + control.id,
    };
}


async function createControlPage(controlYaml: any, release: Release, parsed: CCCReleaseYaml, createData: (name: string, data: string | object) => Promise<string>, addRoute) {
    const control = parseControl(controlYaml, release.slug);

    const relatedThreats = controlYaml.threats?.map(threatId => release.threats.find(t => t.id === threatId)
    ).filter(Boolean) || [];

    const controlPageData: ControlPageData = {
        control: {
            ...control,
            related_threats: relatedThreats,
        },
        releaseTitle: parsed.metadata.title,
        releaseSlug: release.slug,
    };

    const controlPagePath = await createData(
        `ccc - ${release.slug} -${control.id}.json`,
        JSON.stringify(controlPageData, null, 2)
    );

    addRoute({
        path: `${release.slug}/${control.id}`,
        component: '@site/src/components/ccc/Control/index.tsx',
        modules: {
            pageData: controlPagePath,
        },
        exact: true,
    });

    console.log(`Added route for ${control.slug}`);
}

async function createFeaturePage(featureYaml: any, release: Release, parsed: CCCReleaseYaml, createData: (name: string, data: string | object) => Promise<string>, addRoute) {
    const feature = parseFeature(featureYaml, release.slug);

    // Find all threats that reference this feature
    const relatedThreats = release.threats.filter(threat => threat.features.includes(feature.id))


    const featurePageData: FeaturePageData = {
        feature: {
            ...feature,
            related_threats: relatedThreats
        },
        releaseTitle: parsed.metadata.title,
        releaseSlug: release.slug,
    };

    const featurePagePath = await createData(
        `ccc-${release.slug}-${feature.id}.json`,
        JSON.stringify(featurePageData, null, 2)
    );

    addRoute({
        path: `${release.slug}/${feature.id}`,
        component: '@site/src/components/ccc/Feature/index.tsx',
        modules: {
            pageData: featurePagePath,
        },
        exact: true,
    });

    console.log(`Added route for ${feature.slug}`);

}

async function createThreatPage(threatYaml: any, release: Release, parsed: CCCReleaseYaml, createData: (name: string, data: string | object) => Promise<string>, addRoute) {
    const threat = parseThreat(threatYaml, release.slug);

    const relatedControls = release.controls.filter(control => control.threats.includes(threat.id))

    const relatedFeatures = threatYaml.features?.map(featureId => release.features.find(f => f.id === featureId)
    ).filter(Boolean) || [];

    const threatPageData: ThreatPageData = {
        threat: {
            ...threat,
            related_controls: relatedControls,
            related_features: relatedFeatures
        },
        releaseTitle: parsed.metadata.title,
        releaseSlug: release.slug,
    };

    const threatPagePath = await createData(
        `ccc-${release.slug}-${threat.id}.json`,
        JSON.stringify(threatPageData, null, 2)
    );

    addRoute({
        path: `${release.slug}/${threat.id}`,
        component: '@site/src/components/ccc/Threat/index.tsx',
        modules: {
            pageData: threatPagePath,
        },
        exact: true,
    });

    console.log(`Added route for ${threat.slug}`);
}

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
            const { setGlobalData, createData, addRoute } = actions;
            const cccReleases: Release[] = [];

            // Group releases by component
            const components: Record<string, any[]> = {};

            for (const parsed of content) {

                const release = parseRelease(parsed);
                cccReleases.push(release);

                // Create a page data object for the release
                const cccReleasePageData: ReleasePageData = {
                    release,
                    releaseTitle: parsed.metadata.title,
                    releaseSlug: release.slug,
                };

                const componentTitle = parsed.metadata.title;
                if (!components[componentTitle]) {
                    components[componentTitle] = [];
                }

                components[componentTitle].push(release);

                const jsonPath = await createData(
                    `ccc-${release.slug}.json`,
                    JSON.stringify(cccReleasePageData, null, 2)
                );

                addRoute({
                    path: `${release.slug}`,
                    component: '@site/src/components/ccc/Release/index.tsx',
                    modules: {
                        pageData: jsonPath,
                    },
                    exact: true,
                });

                console.log(`Added route for ${release.slug}`);

                for (const controlYaml of parsed.controls) {
                    await createControlPage(controlYaml, release, parsed, createData, addRoute);
                }

                for (const featureYaml of parsed.features || []) {
                    await createFeaturePage(featureYaml, release, parsed, createData, addRoute);
                }

                for (const threatYaml of parsed.threats || []) {
                    await createThreatPage(threatYaml, release, parsed, createData, addRoute);
                }
            }

            // Create home page data
            const homePageData: HomePageData = {
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

            setGlobalData({
                'ccc-releases': cccReleases,
                'ccc-release-yaml': content
            });


            console.log('Added route for /ccc');
        },
    };
}

