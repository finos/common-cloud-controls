import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { LoadContext, Plugin } from '@docusaurus/types';
import { Release, Control, Capability, Component, ReleasePageData, Threat, ControlPageData, FeaturePageData, ThreatPageData, HomePageData, ComponentPageData } from '@site/src/types/ccc';
import { PageCreator } from './PageCreator';

interface CCCReleaseYaml {
    metadata: {
        title: string;
        id: string;
        description: string;
        version: string;
        'last-modified': string;
        release_details?: any[];
    };
    release_details?: any[];
    'control-families': any[];
    controls?: any[];
    features?: any[];
    capabilities: any[];
    threats: any[];
}

type PluginContent = CCCReleaseYaml[];

function parseRelease(parsed: CCCReleaseYaml): Release {
    const releaseDetailsArray = parsed.metadata.release_details ?? parsed.release_details;
    const version = parsed.metadata.version || releaseDetailsArray?.[0]?.version || 'N/A';
    const slug = `/ccc/${parsed.metadata.id}/${version}`;
    console.log(`Processing ${slug}`);
    return {
        metadata: parsed.metadata,
        threats: parsed.threats.map(threat => parseThreat(threat, slug)),
        features: [
            ...(parsed.features ?? []).map(feature => parseFeature(feature, slug)),
            ...(parsed.capabilities ?? []).map(capability => parseFeature(capability, slug))],
        controls: (parsed['control-families'] ?? []).flatMap(controlFamily => parseControlFamily(controlFamily, slug))
            .concat((parsed.controls ?? []).map(control => parseControl(control, slug))),
        slug,
    };
}

function parseThreat(threat: any, slug: string): Threat {
    // Extract feature IDs from capabilities
    const featureIds = threat.capabilities?.find((cap: any) => cap['reference-id'] === 'CCC')?.entries?.map((entry: any) => entry['reference-id']) || [];

    // Extract MITRE techniques from external-mappings
    const mitreTechniques = threat['external-mappings']?.find((mapping: any) => mapping['reference-id'] === 'MITRE-ATT&CK')?.entries?.map((entry: any) => entry['reference-id']) || [];

    return {
        id: threat.id,
        title: threat.title,
        description: threat.description,
        features: featureIds,
        mitre_technique: mitreTechniques,
        slug: slug + "/" + threat.id,
        related_controls: [],
        related_features: []
    };
}

function parseFeature(feature: any, slug: string): Capability {
    return {
        id: feature.id,
        title: feature.title,
        description: feature.description,
        slug: slug + "/" + feature.id,
        threats: [],
        related_threats: []
    };
}

function parseControl(control: any, slug: string): Control {
    // Extract threat IDs from threat-mappings
    const threatIds = control['threat-mappings']?.find((mapping: any) => mapping['reference-id'] === 'CCC')?.entries?.map((entry: any) => entry['reference-id']) || [];

    // Extract test requirements from assessment-requirements
    const testRequirements = control['assessment-requirements']?.map((req: any) => ({
        id: req.id,
        text: req.text,
        tlp_levels: req.applicability || []
    })) || [];

    // Extract control mappings from guideline-mappings
    const controlMappings: { [key: string]: string[] } = {};
    control['guideline-mappings']?.forEach((mapping: any) => {
        const referenceId = mapping['reference-id'];
        controlMappings[referenceId] = mapping.entries?.map((entry: any) => entry['reference-id']) || [];
    });

    return {
        id: control.id,
        title: control.title,
        objective: control.objective,
        control_family: control.control_family || '',
        threats: threatIds,
        related_threats: [],
        nist_csf: controlMappings['NIST-CSF']?.[0],
        control_mappings: controlMappings,
        test_requirements: testRequirements,
        slug: slug + "/" + control.id,
        family: control.family || control.control_family || ''
    };
}

function parseControlFamily(controlFamily: any, slug: string): Control[] {
    const controls = controlFamily.controls
        .map(control => parseControl(control, slug))
        .map(control => {
            return {
                ...control,
                family: controlFamily.title,
                control_family: controlFamily.title
            }
        });
    return controls;
}

function createControlPageData(control: Control, release: Release): ControlPageData {
    const relatedThreats = control.threats?.map(threatId => release.threats.find(t => t.id === threatId)
    ).filter(Boolean) || [];

    return {
        control: {
            ...control,
            related_threats: relatedThreats,
        },
        releaseTitle: release.metadata.title,
        releaseSlug: release.slug,
    };
}

function createFeaturePageData(feature: Capability, release: Release): FeaturePageData {
    // Find all threats that reference this feature
    const relatedThreats = release.threats.filter(threat => threat.features.includes(feature.id))

    return {
        feature: {
            ...feature,
            related_threats: relatedThreats
        },
        releaseTitle: release.metadata.title,
        releaseSlug: release.slug,
    };
}

function createThreatPageData(threat: Threat, release: Release): ThreatPageData {
    const relatedControls = release.controls.filter(control => control.threats.includes(threat.id))

    const relatedFeatures = threat.features?.map(featureId => release.features.find(f => f.id === featureId)
    ).filter(Boolean) || [];

    return {
        threat: {
            ...threat,
            related_controls: relatedControls,
            related_features: relatedFeatures
        },
        releaseTitle: release.metadata.title,
        releaseSlug: release.slug,
    };
}

function createComponentPageData(component: Component): ComponentPageData {
    return {
        component: component,
        releaseTitle: component.releases[0].metadata.title,
        releaseSlug: component.releases[0].slug,
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
            const components: Record<string, Component> = {};

            for (const parsed of content) {
                const release = parseRelease(parsed);
                cccReleases.push(release);

                const componentId = release.metadata.id;
                if (!components[componentId]) {
                    components[componentId] = { title: release.metadata.title, releases: [], slug: `/ccc/${componentId}` };
                }

                components[componentId].releases.push(release);

                const cccReleasePageData: ReleasePageData = {
                    release,
                    releaseTitle: release.metadata.title,
                    releaseSlug: release.slug,
                };

                await pageCreator.createPage(cccReleasePageData, release.slug, '@site/src/components/ccc/Release/index.tsx');

                for (const control of release.controls) {
                    const pageData: ControlPageData = createControlPageData(control, release);
                    await pageCreator.createPage(pageData, `${pageData.control.slug}`, '@site/src/components/ccc/Control/index.tsx');
                }

                for (const feature of release.features || []) {
                    const pageData: FeaturePageData = createFeaturePageData(feature, release);
                    await pageCreator.createPage(pageData, `${pageData.feature.slug}`, '@site/src/components/ccc/Feature/index.tsx');
                }

                for (const threat of release.threats || []) {
                    const pageData: ThreatPageData = createThreatPageData(threat, release);
                    pageCreator.createPage(pageData, `${pageData.threat.slug}`, '@site/src/components/ccc/Threat/index.tsx');
                }
            }

            Object.entries(components).forEach(([componentId, component]) => {
                component.releases.sort((a, b) => b.metadata.version.localeCompare(a.metadata.version));
                const componentPageData: ComponentPageData = createComponentPageData(component);
                pageCreator.createPage(componentPageData, `/ccc/${componentId}`, '@site/src/components/ccc/Component/index.tsx');
            });

            const homePageData: HomePageData = {
                components: Object.entries(components).flatMap(([_, component]) => component),
            };

            await pageCreator.createPage(homePageData, '/ccc', '@site/src/components/ccc/Home/index.tsx');

            setGlobalData({
                'ccc-releases': cccReleases,
                'ccc-release-yaml': content
            });
        },
    };
}
