import path from 'path';
import type { LoadContext, Plugin } from '@docusaurus/types';
import {
    Release,
    Component,
    ReleasePageData,
    ControlPageData,
    CapabilityPageData,
    ThreatPageData,
    HomePageData,
    ComponentPageData,
} from '@site/src/types/ccc';
import { PageCreator } from './PageCreator';
import {
    buildCatalogIndex,
    loadTypedReleaseBundles,
    lookupCapabilities,
    lookupThreats,
    mappingEntryIds,
    mappingsReferenceId,
    parseReleaseNative,
    resolveReleaseImports,
    slugsForIds,
    type CatalogIndex,
    type TypedReleaseBundle,
} from './catalogUtils';

type PluginContent = { bundles: TypedReleaseBundle[] };

function createControlPageData(control: Release['controls'][0], release: Release, index: CatalogIndex): ControlPageData {
    const releaseSlug = `/ccc/${release.metadata.id}/${release.metadata.version}`;
    const controlSlug = `${releaseSlug}/${control.id}`;

    const relatedThreats = lookupThreats(mappingEntryIds(control.threat_mappings), index);

    const capabilityIds = relatedThreats.flatMap((threat) => mappingEntryIds(threat.capabilities));
    const relatedCapabilities = lookupCapabilities(capabilityIds, index);

    const entrySlugs = {
        ...slugsForIds(relatedThreats.map((t) => t.id), index.threatSlugs),
        ...slugsForIds(relatedCapabilities.map((c) => c.id), index.capabilitySlugs),
    };

    return {
        control,
        related_threats: relatedThreats,
        related_capabilities: relatedCapabilities,
        entrySlugs,
        releaseTitle: release.metadata.title,
        releaseSlug,
        slug: controlSlug,
    };
}

function createCapabilityPageData(
    capability: Release['capabilities'][0],
    release: Release,
    index: CatalogIndex
): CapabilityPageData {
    const releaseSlug = `/ccc/${release.metadata.id}/${release.metadata.version}`;
    const capabilitySlug = `${releaseSlug}/${capability.id}`;

    const relatedThreats = [...index.threats.values()].filter((threat) =>
        mappingsReferenceId(threat.capabilities, capability.id)
    );

    return {
        capability,
        related_threats: relatedThreats,
        entrySlugs: slugsForIds(relatedThreats.map((t) => t.id), index.threatSlugs),
        releaseTitle: release.metadata.title,
        releaseSlug,
        slug: capabilitySlug,
    };
}

function createThreatPageData(threat: Release['threats'][0], release: Release, index: CatalogIndex): ThreatPageData {
    const releaseSlug = `/ccc/${release.metadata.id}/${release.metadata.version}`;
    const threatSlug = `${releaseSlug}/${threat.id}`;

    const relatedControls = release.controls.filter((control) =>
        mappingsReferenceId(control.threat_mappings, threat.id)
    );

    const relatedCapabilities = lookupCapabilities(mappingEntryIds(threat.capabilities), index);

    return {
        threat,
        related_capabilities: relatedCapabilities,
        related_controls: relatedControls,
        entrySlugs: {
            ...slugsForIds(relatedCapabilities.map((c) => c.id), index.capabilitySlugs),
            ...slugsForIds(relatedControls.map((c) => c.id), index.controlSlugs),
        },
        releaseTitle: release.metadata.title,
        releaseSlug,
        slug: threatSlug,
    };
}

function createReleasePageData(release: Release): ReleasePageData {
    const releaseSlug = `/ccc/${release.metadata.id}/${release.metadata.version}`;

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
            quote: '',
        },
        'change-log': [],
        contributors: [],
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
        component: {
            id: component.id,
            title: component.title,
            releases: component.releases.map((r) => ({
                metadata: {
                    id: r.metadata.id,
                    version: r.metadata.version,
                    release_details: r.metadata.release_details,
                },
                controlsCount: r.controls.length,
                threatsCount: r.threats.length,
                capabilitiesCount: r.capabilities.length,
            })),
        },
        releaseTitle: component.releases[0]?.metadata.title || component.title,
        releaseSlug: component.releases[0]
            ? `/ccc/${component.id}/${component.releases[0].metadata.version}`
            : componentSlug,
        slug: componentSlug,
    };
}

export default function pluginCCCPages(_: LoadContext): Plugin<PluginContent> {
    return {
        name: 'ccc-pages',

        async loadContent(): Promise<PluginContent> {
            const dataDir = path.resolve(__dirname, '../../data/ccc-releases');
            const bundles = loadTypedReleaseBundles(dataDir);
            console.log(`Found ${bundles.length} typed catalog releases in ccc-releases`);
            return { bundles };
        },

        async contentLoaded({ actions, content }) {
            const { setGlobalData, createData, addRoute } = actions;
            const pageCreator = new PageCreator(createData, addRoute);

            console.log('Step 1: Loading typed Gemara releases...');
            const nativeReleases = content.bundles.map((bundle) => {
                const release = parseReleaseNative(bundle);
                console.log(
                    `  ${release.metadata.id} v${release.metadata.version}: ` +
                        `${release.capabilities.length} capabilities, ` +
                        `${release.controls.length} controls, ` +
                        `${release.threats.length} threats`
                );
                return { bundle, release };
            });

            const index = buildCatalogIndex(nativeReleases.map(({ release }) => release));
            const cccReleases: Release[] = nativeReleases.map(({ bundle, release }) =>
                resolveReleaseImports(release, bundle, index)
            );

            const components: Record<string, Component> = {};
            for (const release of cccReleases) {
                const componentId = release.metadata.id;
                if (!components[componentId]) {
                    components[componentId] = {
                        id: componentId,
                        title: release.metadata.title,
                        releases: [],
                    };
                }
                components[componentId].releases.push(release);
            }

            Object.values(components).forEach((component) => {
                component.releases.sort((a, b) => b.metadata.version.localeCompare(a.metadata.version));
            });

            console.log(`Loaded ${cccReleases.length} releases across ${Object.keys(components).length} components`);

            console.log('Step 2: Creating page data with relationships...');

            for (const release of cccReleases) {
                const releasePageData = createReleasePageData(release);
                await pageCreator.createPage(
                    releasePageData,
                    releasePageData.slug,
                    '@site/src/components/ccc/Release/index.tsx'
                );
            }

            for (const release of cccReleases) {
                for (const control of release.controls) {
                    const controlPageData = createControlPageData(control, release, index);
                    await pageCreator.createPage(
                        controlPageData,
                        controlPageData.slug,
                        '@site/src/components/ccc/Control/index.tsx'
                    );
                }
            }

            for (const release of cccReleases) {
                for (const capability of release.capabilities) {
                    const capabilityPageData = createCapabilityPageData(capability, release, index);
                    await pageCreator.createPage(
                        capabilityPageData,
                        capabilityPageData.slug,
                        '@site/src/components/ccc/Capability/index.tsx'
                    );
                }
            }

            for (const release of cccReleases) {
                for (const threat of release.threats) {
                    const threatPageData = createThreatPageData(threat, release, index);
                    await pageCreator.createPage(
                        threatPageData,
                        threatPageData.slug,
                        '@site/src/components/ccc/Threat/index.tsx'
                    );
                }
            }

            for (const component of Object.values(components)) {
                const componentPageData = createComponentPageData(component);
                await pageCreator.createPage(
                    componentPageData,
                    componentPageData.slug,
                    '@site/src/components/ccc/Component/index.tsx'
                );
            }

            const homePageData: HomePageData = {
                components: Object.values(components).map((c) => ({
                    id: c.id,
                    title: c.title,
                    releases: c.releases.map((r) => ({
                        metadata: {
                            id: r.metadata.id,
                            version: r.metadata.version,
                            release_details: r.metadata.release_details,
                        },
                    })),
                })),
                generatedAt: new Date().toISOString(),
            };
            await pageCreator.createPage(homePageData, '/ccc', '@site/src/components/ccc/Home/index.tsx');

            console.log('Step 2 complete: All page data created with relationships');

            setGlobalData({
                'ccc-releases': cccReleases,
            });
        },
    };
}
