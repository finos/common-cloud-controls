/**
 * Build-time catalog requirement index and URL helpers for CFI / cross-plugin lookups.
 * Populated by the catalog-routes plugin; consumed at runtime via global data.
 */

export interface CatalogRequirementRef {
    requirementId: string;
    text: string;
    catalogId: string;
    version: string;
    controlId: string;
    category: string;
    service: string;
}

export interface CatalogPathRef {
    category: string;
    service: string;
    versions: string[];
}

export interface CatalogLookupIndex {
    requirements: Record<string, CatalogRequirementRef>;
    catalogs: Record<string, CatalogPathRef>;
}

export interface ResolvedRequirement {
    requirementId: string;
    text: string;
    catalogId: string;
    version: string;
    controlId: string;
    url: string;
}

/** e.g. CCC.ObjStor.CN01.AR02 → CCC.ObjStor */
export function extractCatalogId(requirementOrCatalogRef: string): string {
    const parts = requirementOrCatalogRef.split('.');
    return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : requirementOrCatalogRef;
}

/** e.g. CCC.ObjStor.CN01.AR02 → CCC.ObjStor.CN01 */
export function controlIdFromRequirementId(requirementId: string): string {
    const parts = requirementId.split('.');
    if (parts.length >= 3) {
        return parts.slice(0, 3).join('.');
    }
    return requirementId;
}

export function requirementAnchorId(requirementId: string): string {
    return requirementId.split('.').pop()?.toLowerCase() ?? requirementId.toLowerCase();
}

export function getCatalogControlsVersionUrl(
    category: string,
    service: string,
    version: string,
    anchorId?: string
): string {
    const base = `/catalogs/${category}/${service}/controls/${version}`;
    if (!anchorId) {
        return base;
    }
    return `${base}#${anchorId.toLowerCase()}`;
}

export function getCatalogRequirementUrl(ref: Pick<CatalogRequirementRef, 'category' | 'service' | 'version'>, requirementId: string): string {
    const controlAnchor = controlIdFromRequirementId(requirementId).toLowerCase();
    return getCatalogControlsVersionUrl(ref.category, ref.service, ref.version, controlAnchor);
}

export function preferredCatalogVersion(catalog: CatalogPathRef | undefined, hint?: string): string | undefined {
    if (!catalog?.versions.length) {
        return hint;
    }
    if (hint && catalog.versions.includes(hint)) {
        return hint;
    }
    return catalog.versions[0];
}

export function getCatalogLandingUrl(
    lookup: CatalogLookupIndex | undefined,
    catalogId: string,
    versionHint?: string
): string | undefined {
    const catalog = lookup?.catalogs[catalogId];
    if (!catalog) {
        return undefined;
    }
    const version = preferredCatalogVersion(catalog, versionHint);
    if (!version) {
        return `/catalogs/${catalog.category}/${catalog.service}/controls`;
    }
    return getCatalogControlsVersionUrl(catalog.category, catalog.service, version);
}

export function resolveRequirementFromCatalogLookup(
    lookup: CatalogLookupIndex | undefined,
    requirementId: string
): ResolvedRequirement | null {
    const ref = lookup?.requirements[requirementId];
    if (!ref) {
        return null;
    }
    return {
        requirementId: ref.requirementId,
        text: ref.text,
        catalogId: ref.catalogId,
        version: ref.version,
        controlId: ref.controlId,
        url: getCatalogRequirementUrl(ref, requirementId),
    };
}

export function listRequirementIdsForCatalog(lookup: CatalogLookupIndex | undefined, catalogId: string): string[] {
    if (!lookup) {
        return [];
    }
    return Object.values(lookup.requirements)
        .filter((ref) => ref.catalogId === catalogId)
        .map((ref) => ref.requirementId);
}
