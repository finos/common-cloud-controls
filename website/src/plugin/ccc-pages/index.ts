import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { LoadContext, Plugin } from '@docusaurus/types';
import { Release, Control, Feature, ReleasePageData, Threat, ControlPageData, FeaturePageData, ThreatPageData, HomePageData } from '@site/src/types/ccc';
import { PageCreator } from './PageCreator';

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

function createControlPageData(controlYaml: any, release: Release, parsed: CCCReleaseYaml): ControlPageData {
    const control = parseControl(controlYaml, release.slug);

    const relatedThreats = controlYaml.threats?.map(threatId => release.threats.find(t => t.id === threatId)
    ).filter(Boolean) || [];

    return {
        control: {
            ...control,
            related_threats: relatedThreats,
        },
        releaseTitle: parsed.metadata.title,
        releaseSlug: release.slug,
    };
}

function createFeaturePageData(featureYaml: any, release: Release, parsed: CCCReleaseYaml): FeaturePageData {
    const feature = parseFeature(featureYaml, release.slug);

    // Find all threats that reference this feature
    const relatedThreats = release.threats.filter(threat => threat.features.includes(feature.id))

    return {
        feature: {
            ...feature,
            related_threats: relatedThreats
        },
        releaseTitle: parsed.metadata.title,
        releaseSlug: release.slug,
    };
}

function createThreatPageData(threatYaml: any, release: Release, parsed: CCCReleaseYaml): ThreatPageData {
    const threat = parseThreat(threatYaml, release.slug);

    const relatedControls = release.controls.filter(control => control.threats.includes(threat.id))

    const relatedFeatures = threatYaml.features?.map(featureId => release.features.find(f => f.id === featureId)
    ).filter(Boolean) || [];

    return {
        threat: {
            ...threat,
            related_controls: relatedControls,
            related_features: relatedFeatures
        },
        releaseTitle: parsed.metadata.title,
        releaseSlug: release.slug,
    };
}

export default function pluginCCCPages(_: LoadContext): Plugin<PluginContent> {
    return {
        name: 'ccc-pages',

        async loadContent(): Promise<PluginContent> {
            const dataDir = path.resolve(__dirname, '../../data/ccc-releases');
            const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.yaml'));

            return files.map((file) => {
                const filePath = path.join(dataDir, file);
                const raw = fs.readFileSync(filePath, 'utf8');
                return yaml.load(raw) as CCCReleaseYaml;
            });
        },

        async contentLoaded({ actions, content }) {
            const { setGlobalData, createData, addRoute } = actions;
            const pageCreator: PageCreator = new PageCreator(createData, addRoute);
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

                await pageCreator.createPage(cccReleasePageData, release.slug, '@site/src/components/ccc/Release/index.tsx');

                for (const controlYaml of parsed.controls) {
                    const pageData: ControlPageData = createControlPageData(controlYaml, release, parsed);
                    await pageCreator.createPage(pageData, `${pageData.control.slug}`, '@site/src/components/ccc/Control/index.tsx');
                }

                for (const featureYaml of parsed.features || []) {
                    const pageData: FeaturePageData = createFeaturePageData(featureYaml, release, parsed);
                    await pageCreator.createPage(pageData, `${pageData.feature.slug}`, '@site/src/components/ccc/Feature/index.tsx');
                }

                for (const threatYaml of parsed.threats || []) {
                    const pageData: ThreatPageData = createThreatPageData(threatYaml, release, parsed);
                    pageCreator.createPage(pageData, `${pageData.threat.slug}`, '@site/src/components/ccc/Threat/index.tsx');
                }
            }

            const homePageData: HomePageData = {
                components: Object.entries(components).map(([title, releases]) => ({
                    title,
                    releases: releases.sort((a, b) => b.version.localeCompare(a.version))
                }))
            };

            await pageCreator.createPage(homePageData, '/ccc', '@site/src/components/ccc/Home/index.tsx');

            setGlobalData({
                'ccc-releases': cccReleases,
                'ccc-release-yaml': content
            });
        },
    };
}
