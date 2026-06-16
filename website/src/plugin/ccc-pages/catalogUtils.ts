import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { Capability, Control, Mapping, Metadata, Release, ReleaseDetails, Threat } from '@site/src/types/ccc';

const TYPED_FILE =
    /^(?<catalogId>CCC\.[A-Za-z0-9.]+)_(?<version>.+)-(?<assetType>metadata|capabilities|controls|threats|release-details)\.yaml$/;

export type AssetType = 'metadata' | 'capabilities' | 'controls' | 'threats' | 'release-details';

export interface TypedReleaseBundle {
    catalogId: string;
    version: string;
    metadata?: { metadata: Record<string, unknown> };
    capabilities?: Record<string, unknown>;
    controls?: Record<string, unknown>;
    threats?: Record<string, unknown>;
    releaseDetails?: ReleaseDetails | null;
}

export interface CatalogIndex {
    capabilities: Map<string, Capability>;
    controls: Map<string, Control>;
    threats: Map<string, Threat>;
    capabilitySlugs: Map<string, string>;
    threatSlugs: Map<string, string>;
    controlSlugs: Map<string, string>;
}

export function loadTypedReleaseBundles(dataDir: string): TypedReleaseBundle[] {
    const bundles = new Map<string, TypedReleaseBundle>();

    for (const file of fs.readdirSync(dataDir)) {
        if (!file.endsWith('.yaml')) {
            continue;
        }

        const match = file.match(TYPED_FILE);
        if (!match?.groups) {
            continue;
        }

        const { catalogId, version, assetType } = match.groups as {
            catalogId: string;
            version: string;
            assetType: AssetType;
        };
        const key = `${catalogId}_${version}`;
        if (!bundles.has(key)) {
            bundles.set(key, { catalogId, version });
        }

        const bundle = bundles.get(key)!;
        const doc = yaml.load(fs.readFileSync(path.join(dataDir, file), 'utf8')) as Record<string, unknown>;

        switch (assetType) {
            case 'metadata':
                bundle.metadata = doc as { metadata: Record<string, unknown> };
                break;
            case 'capabilities':
                bundle.capabilities = doc;
                break;
            case 'controls':
                bundle.controls = doc;
                break;
            case 'threats':
                bundle.threats = doc;
                break;
            case 'release-details': {
                const rows = Array.isArray(doc) ? doc : [];
                bundle.releaseDetails = (rows[0] as ReleaseDetails) ?? null;
                break;
            }
        }
    }

    return [...bundles.values()]
        .filter((bundle) => {
            if (bundle.metadata?.metadata) {
                return true;
            }
            console.warn(
                `Skipping incomplete release ${bundle.catalogId} ${bundle.version}: missing -metadata.yaml`
            );
            return false;
        })
        .sort((a, b) => `${a.catalogId}_${a.version}`.localeCompare(`${b.catalogId}_${b.version}`));
}

export function mappingEntryIds(mappings: Mapping[] | undefined): string[] {
    const ids: string[] = [];
    for (const mapping of mappings ?? []) {
        for (const entry of mapping.entries ?? []) {
            ids.push(entry['reference-id']);
        }
    }
    return ids;
}

export function mappingsReferenceId(mappings: Mapping[] | undefined, targetId: string): boolean {
    return mappingEntryIds(mappings).includes(targetId);
}

function parseThreat(raw: Record<string, unknown>): Threat {
    return {
        id: raw.id as string,
        title: raw.title as string,
        description: raw.description as string,
        capabilities: (raw.capabilities as Mapping[]) ?? [],
        'external-mappings': (raw['external-mappings'] as Mapping[]) ?? [],
    };
}

function parseCapability(raw: Record<string, unknown>): Capability {
    return {
        id: raw.id as string,
        title: raw.title as string,
        description: raw.description as string,
    };
}

function parseGemaraControl(raw: Record<string, unknown>, group?: Record<string, unknown>): Control {
    return {
        id: raw.id as string,
        title: raw.title as string,
        objective: raw.objective as string,
        threat_mappings: (raw.threats as Mapping[]) ?? [],
        guideline_mappings: (raw.guidelines as Mapping[]) ?? [],
        test_requirements: ((raw['assessment-requirements'] as Record<string, unknown>[]) ?? []).map((req) => ({
            id: req.id as string,
            text: req.text as string,
            applicability: (req.applicability as Control['test_requirements'][0]['applicability']) ?? [],
        })),
        family: {
            id: (raw.group as string) ?? '',
            title: (group?.title as string) ?? (raw.group as string) ?? '',
            description: (group?.description as string) ?? '',
        },
    };
}

function parseControlsCatalog(catalog: Record<string, unknown> | undefined): Control[] {
    if (!catalog) {
        return [];
    }

    const groups = new Map(
        ((catalog.groups as Record<string, unknown>[]) ?? []).map((g) => [g.id as string, g])
    );

    return ((catalog.controls as Record<string, unknown>[]) ?? []).map((control) =>
        parseGemaraControl(control, groups.get(control.group as string))
    );
}

function parseThreatsCatalog(catalog: Record<string, unknown> | undefined): Threat[] {
    return ((catalog?.threats as Record<string, unknown>[]) ?? []).map(parseThreat);
}

function parseNativeCapabilities(catalog: Record<string, unknown> | undefined): Capability[] {
    return ((catalog?.capabilities as Record<string, unknown>[]) ?? []).map(parseCapability);
}

function resolveImportedEntries<T extends { id: string }>(
    catalog: Record<string, unknown> | undefined,
    native: T[],
    lookup: (id: string) => T | undefined
): T[] {
    const seen = new Set(native.map((entry) => entry.id));
    const merged = [...native];

    for (const block of (catalog?.imports as Mapping[]) ?? []) {
        for (const entry of block.entries ?? []) {
            const id = entry['reference-id'];
            if (seen.has(id)) {
                continue;
            }
            const resolved = lookup(id);
            if (resolved) {
                seen.add(id);
                merged.push(resolved);
            }
        }
    }

    return merged;
}

function resolveImportedCapabilities(
    catalog: Record<string, unknown> | undefined,
    index: CatalogIndex
): Capability[] {
    return resolveImportedEntries(
        catalog,
        parseNativeCapabilities(catalog),
        (id) => index.capabilities.get(id)
    );
}

function resolveImportedControls(
    catalog: Record<string, unknown> | undefined,
    nativeControls: Control[],
    index: CatalogIndex
): Control[] {
    return resolveImportedEntries(catalog, nativeControls, (id) => index.controls.get(id));
}

function resolveImportedThreats(
    catalog: Record<string, unknown> | undefined,
    nativeThreats: Threat[],
    index: CatalogIndex
): Threat[] {
    return resolveImportedEntries(catalog, nativeThreats, (id) => index.threats.get(id));
}

/** First pass: native entries only (for building the cross-release index). */
export function parseReleaseNative(bundle: TypedReleaseBundle): Release {
    if (!bundle.metadata?.metadata) {
        throw new Error(`Missing metadata for ${bundle.catalogId} ${bundle.version}`);
    }

    const metadata: Metadata = {
        ...(bundle.metadata.metadata as unknown as Metadata),
        release_details: bundle.releaseDetails ? [bundle.releaseDetails] : undefined,
    };

    return {
        metadata,
        capabilities: parseNativeCapabilities(bundle.capabilities),
        controls: parseControlsCatalog(bundle.controls),
        threats: parseThreatsCatalog(bundle.threats),
    };
}

export function buildCatalogIndex(releases: Release[]): CatalogIndex {
    const capabilities = new Map<string, Capability>();
    const controls = new Map<string, Control>();
    const threats = new Map<string, Threat>();
    const capabilitySlugs = new Map<string, string>();
    const threatSlugs = new Map<string, string>();
    const controlSlugs = new Map<string, string>();

    for (const release of releases) {
        const releaseSlug = `/ccc/${release.metadata.id}/${release.metadata.version}`;
        for (const capability of release.capabilities) {
            capabilities.set(capability.id, capability);
            capabilitySlugs.set(capability.id, `${releaseSlug}/${capability.id}`);
        }
        for (const control of release.controls) {
            controls.set(control.id, control);
            controlSlugs.set(control.id, `${releaseSlug}/${control.id}`);
        }
        for (const threat of release.threats) {
            threats.set(threat.id, threat);
            threatSlugs.set(threat.id, `${releaseSlug}/${threat.id}`);
        }
    }

    return { capabilities, controls, threats, capabilitySlugs, threatSlugs, controlSlugs };
}

/** Second pass: merge imported capabilities, controls, and threats from the global index. */
export function resolveReleaseImports(release: Release, bundle: TypedReleaseBundle, index: CatalogIndex): Release {
    return {
        ...release,
        capabilities: resolveImportedCapabilities(bundle.capabilities, index),
        controls: resolveImportedControls(bundle.controls, release.controls, index),
        threats: resolveImportedThreats(bundle.threats, release.threats, index),
    };
}

export function lookupThreats(ids: string[], index: CatalogIndex): Threat[] {
    return ids.map((id) => index.threats.get(id)).filter((t): t is Threat => t !== undefined);
}

export function slugsForIds(ids: string[], slugMap: Map<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const id of ids) {
        const slug = slugMap.get(id);
        if (slug) {
            out[id] = slug;
        }
    }
    return out;
}

export function lookupCapabilities(ids: string[], index: CatalogIndex): Capability[] {
    const seen = new Set<string>();
    const out: Capability[] = [];
    for (const id of ids) {
        if (seen.has(id)) {
            continue;
        }
        const cap = index.capabilities.get(id);
        if (cap) {
            seen.add(id);
            out.push(cap);
        }
    }
    return out;
}
