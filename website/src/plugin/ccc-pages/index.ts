import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { LoadContext, Plugin } from '@docusaurus/types';
import { Release, Control, Capability, Component, ReleasePageData, Threat, ControlPageData, FeaturePageData, ThreatPageData, HomePageData, ComponentPageData } from '@site/src/types/ccc';
import { PageCreator } from './PageCreator';

type PluginContent = any[];

function parseRelease(releaseData: { mainCatalog: any; releaseDetails: any }): Release {
    const { mainCatalog, releaseDetails } = releaseData;
    console.log(`Processing release ${mainCatalog.metadata.id} v${mainCatalog.metadata.version}`);

    // Merge release details into metadata if available
    const metadata = {
        ...mainCatalog.metadata,
        release_details: releaseDetails ? [releaseDetails] : undefined
    };

    return {
        metadata,
        threats: mainCatalog.threats.map(threat => parseThreat(threat)),
        capabilities: [
            ...(mainCatalog.features ?? []).map(feature => parseCapability(feature)),
            ...(mainCatalog.capabilities ?? []).map(capability => parseCapability(capability))
        ],
        controls: (mainCatalog['control-families'] ?? []).flatMap(controlFamily => parseControlFamily(controlFamily))
            .concat((mainCatalog.controls ?? []).map(control => parseControl(control))),
    };
}

function parseThreat(threat: any): Threat {
    return {
        id: threat.id,
        title: threat.title,
        description: threat.description,
        capabilities: threat.capabilities || [],
    };
}

function parseCapability(capability: any): Capability {
    return {
        id: capability.id,
        title: capability.title,
        description: capability.description,
    };
}

function parseControl(control: any): Control {
    // Extract test requirements from assessment-requirements
    const testRequirements = control['assessment-requirements']?.map((req: any) => ({
        id: req.id,
        text: req.text,
        applicability: req.applicability || []
    })) || [];

    return {
        id: control.id,
        title: control.title,
        objective: control.objective,
        threat_mappings: control['threat-mappings'] || [],
        guideline_mappings: control['guideline-mappings'] || [],
        test_requirements: testRequirements,
        family: {
            id: control.control_family || '',
            title: control.control_family || '',
            description: ''
        }
    };
}

function parseControlFamily(controlFamily: any): Control[] {
    return controlFamily.controls.map(control => {
        const parsedControl = parseControl(control);
        return {
            ...parsedControl,
            family: {
                id: controlFamily.id || '',
                title: controlFamily.title,
                description: controlFamily.description || ''
            }
        };
    });
}

// Step 2: Create PageData objects with relationships and slugs
function createControlPageData(control: Control, release: Release, allReleases: Release[]): ControlPageData {
    const releaseSlug = `/ccc/${release.metadata.id}/${release.metadata.version}`;
    const controlSlug = `${releaseSlug}/${control.id}`;

    // Find related threats by looking at threat_mappings
    const relatedThreats = control.threat_mappings
        ?.find(mapping => mapping['reference-id'] === 'CCC')
        ?.entries?.map(entry =>
            allReleases.flatMap(r => r.threats).find(t => t.id === entry['reference-id'])
        ).filter(Boolean) || [];

    // Find related capabilities by looking at which threats reference them
    const relatedCapabilities = relatedThreats
        .flatMap(threat => threat.capabilities)
        ?.find(cap => cap['reference-id'] === 'CCC')
        ?.entries?.map(entry =>
            allReleases.flatMap(r => r.capabilities).find(c => c.id === entry['reference-id'])
        ).filter(Boolean) || [];

    return {
        control,
        related_threats: relatedThreats,
        related_capabilities: relatedCapabilities,
        releaseTitle: release.metadata.title,
        releaseSlug,
        slug: controlSlug,
    };
}

function createFeaturePageData(capability: Capability, release: Release, allReleases: Release[]): FeaturePageData {
    const releaseSlug = `/ccc/${release.metadata.id}/${release.metadata.version}`;
    const capabilitySlug = `${releaseSlug}/${capability.id}`;

    // Find related threats that reference this capability
    const relatedThreats = allReleases.flatMap(r => r.threats)
        .filter(threat =>
            threat.capabilities?.find(cap => cap['reference-id'] === 'CCC')
                ?.entries?.some(entry => entry['reference-id'] === capability.id)
        );

    return {
        feature: capability,
        related_threats: relatedThreats,
        releaseTitle: release.metadata.title,
        releaseSlug,
        slug: capabilitySlug,
    };
}

function createThreatPageData(threat: Threat, release: Release, allReleases: Release[]): ThreatPageData {
    const releaseSlug = `/ccc/${release.metadata.id}/${release.metadata.version}`;
    const threatSlug = `${releaseSlug}/${threat.id}`;

    // Find related controls by looking at threat_mappings
    const relatedControls = allReleases.flatMap(r => r.controls)
        .filter(control =>
            control.threat_mappings
                ?.find(mapping => mapping['reference-id'] === 'CCC')
                ?.entries?.some(entry => entry['reference-id'] === threat.id)
        );

    // Find related capabilities
    const relatedCapabilities = threat.capabilities
        ?.find(cap => cap['reference-id'] === 'CCC')
        ?.entries?.map(entry =>
            allReleases.flatMap(r => r.capabilities).find(c => c.id === entry['reference-id'])
        ).filter(Boolean) || [];

    return {
        threat,
        related_capabilities: relatedCapabilities,
        related_controls: relatedControls,
        releaseTitle: release.metadata.title,
        releaseSlug,
        slug: threatSlug,
    };
}

function createReleasePageData(release: Release): ReleasePageData {
    const releaseSlug = `/ccc/${release.metadata.id}/${release.metadata.version}`;

    // Use release details from metadata if available, otherwise use fallback
    const releaseDetails = release.metadata.release_details?.[0] || {
        version: release.metadata.version,
        'assurance-level': null,
        'threat-model-url': null,
        'threat-model-author': null,
        'red-team': null,
        'red-team-exercise-url': null,
        'release-manager': {
            name: '',
            'github-id': '',
            company: '',
            quote: ''
        },
        'change-log': [],
        'contributors': []
    };

    return {
        release,
        release_details: releaseDetails,
        releaseTitle: release.metadata.title,
        releaseSlug,
        slug: releaseSlug,
    };
}

function createComponentPageData(component: Component): ComponentPageData {
    const componentSlug = `/ccc/${component.id}`;

    return {
        component,
        related_releases: component.releases,
        releaseTitle: component.releases[0]?.metadata.title || component.title,
        releaseSlug: component.releases[0] ? `/ccc/${component.id}/${component.releases[0].metadata.version}` : componentSlug,
        slug: componentSlug,
    };
}

export default function pluginCCCPages(_: LoadContext): Plugin<PluginContent> {
    return {
        name: 'ccc-pages',

        async loadContent(): Promise<PluginContent> {
            const dataDir = path.resolve(__dirname, '../../data/ccc-releases');
            const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.yaml'));

            // Separate main catalog files from release details files
            const mainCatalogFiles = files.filter(f => !f.includes('-release-details'));
            const releaseDetailsFiles = files.filter(f => f.includes('-release-details'));

            const releases: any[] = [];

            for (const mainFile of mainCatalogFiles) {
                const filePath = path.join(dataDir, mainFile);
                const raw = fs.readFileSync(filePath, 'utf8');
                const mainCatalog = yaml.load(raw) as any;

                // Find corresponding release details file
                const baseName = mainFile.replace('.yaml', '');
                const releaseDetailsFile = releaseDetailsFiles.find(f => f.startsWith(baseName));

                let releaseDetails = null;
                if (releaseDetailsFile) {
                    const detailsPath = path.join(dataDir, releaseDetailsFile);
                    const detailsRaw = fs.readFileSync(detailsPath, 'utf8');
                    const detailsData = yaml.load(detailsRaw) as any[];
                    // Release details files contain an array, take the first (and typically only) element
                    releaseDetails = detailsData?.[0] || null;
                }

                releases.push({
                    mainCatalog,
                    releaseDetails
                });
            }

            return releases;
        },

        async contentLoaded({ actions, content }) {
            const { setGlobalData, createData, addRoute } = actions;
            const pageCreator: PageCreator = new PageCreator(createData, addRoute);

            // Step 1: Load all ccc-releases directory contents into Release/Component objects
            console.log('Step 1: Loading releases and components...');
            const cccReleases: Release[] = [];
            const components: Record<string, Component> = {};

            for (const parsed of content) {
                const release = parseRelease(parsed);
                cccReleases.push(release);

                const componentId = release.metadata.id;
                if (!components[componentId]) {
                    components[componentId] = {
                        id: componentId,
                        title: release.metadata.title,
                        releases: []
                    };
                }

                components[componentId].releases.push(release);
            }

            // Sort releases by version
            Object.values(components).forEach(component => {
                component.releases.sort((a, b) => b.metadata.version.localeCompare(a.metadata.version));
            });

            console.log(`Loaded ${cccReleases.length} releases across ${Object.keys(components).length} components`);

            // Step 2: Create all *PageData objects with relationships and slugs
            console.log('Step 2: Creating page data with relationships...');

            // Create release pages
            for (const release of cccReleases) {
                const releasePageData = createReleasePageData(release);
                await pageCreator.createPage(releasePageData, releasePageData.slug, '@site/src/components/ccc/Release/index.tsx');
            }

            // Create control pages
            for (const release of cccReleases) {
                for (const control of release.controls) {
                    const controlPageData = createControlPageData(control, release, cccReleases);
                    await pageCreator.createPage(controlPageData, controlPageData.slug, '@site/src/components/ccc/Control/index.tsx');
                }
            }

            // Create capability pages
            for (const release of cccReleases) {
                for (const capability of release.capabilities) {
                    const capabilityPageData = createFeaturePageData(capability, release, cccReleases);
                    await pageCreator.createPage(capabilityPageData, capabilityPageData.slug, '@site/src/components/ccc/Feature/index.tsx');
                }
            }

            // Create threat pages
            for (const release of cccReleases) {
                for (const threat of release.threats) {
                    const threatPageData = createThreatPageData(threat, release, cccReleases);
                    await pageCreator.createPage(threatPageData, threatPageData.slug, '@site/src/components/ccc/Threat/index.tsx');
                }
            }

            // Create component pages
            for (const [componentId, component] of Object.entries(components)) {
                const componentPageData = createComponentPageData(component);
                await pageCreator.createPage(componentPageData, componentPageData.slug, '@site/src/components/ccc/Component/index.tsx');
            }

            // Create home page
            const homePageData: HomePageData = {
                components: Object.values(components),
            };
            await pageCreator.createPage(homePageData, '/ccc', '@site/src/components/ccc/Home/index.tsx');

            console.log('Step 2 complete: All page data created with relationships');

            setGlobalData({
                'ccc-releases': cccReleases,
                'ccc-components': Object.values(components),
                'ccc-release-yaml': content
            });
        },
    };
}
