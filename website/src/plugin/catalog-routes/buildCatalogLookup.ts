import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { CatalogLookupIndex, CatalogPathRef, CatalogRequirementRef } from '../../content/catalogLookup';
import { controlIdFromRequirementId, extractCatalogId } from '../../content/catalogLookup';

function cleanText(value: unknown): string {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function parseVersionTag(tag: string): [number, number, boolean, number] {
    const m = tag.replace(/^v/, '').match(/^(\d{4})\.(\d{2})(?:-rc(\d+))?$/);
    if (!m) return [0, 0, false, 0];
    return [+m[1], +m[2], !!m[3], m[3] ? +m[3] : 0];
}

function compareVersions(a: string, b: string): number {
    if (a === 'DEV' && b !== 'DEV') return 1;
    if (b === 'DEV' && a !== 'DEV') return -1;
    const [yA, mA, rcA, nA] = parseVersionTag(a);
    const [yB, mB, rcB, nB] = parseVersionTag(b);
    if (yA !== yB) return yB - yA;
    if (mA !== mB) return mB - mA;
    if (rcA !== rcB) return rcA ? 1 : -1;
    return nB - nA;
}

function addVersions(catalogs: Record<string, CatalogPathRef>, catalogId: string, loc: { category: string; service: string }, version: string) {
    if (!catalogs[catalogId]) {
        catalogs[catalogId] = { category: loc.category, service: loc.service, versions: [] };
    }
    if (!catalogs[catalogId].versions.includes(version)) {
        catalogs[catalogId].versions.push(version);
    }
}

function registerRequirement(
    requirements: Record<string, CatalogRequirementRef>,
    catalogs: Record<string, CatalogPathRef>,
    loc: { category: string; service: string },
    catalogId: string,
    version: string,
    requirementId: string,
    text: string
) {
    addVersions(catalogs, catalogId, loc, version);
    requirements[requirementId] = {
        requirementId,
        text: cleanText(text),
        catalogId,
        version,
        controlId: controlIdFromRequirementId(requirementId),
        category: loc.category,
        service: loc.service,
    };
}

function ingestControlsDocument(
    raw: Record<string, unknown>,
    loc: { category: string; service: string },
    catalogId: string,
    version: string,
    requirements: Record<string, CatalogRequirementRef>,
    catalogs: Record<string, CatalogPathRef>
) {
    for (const control of (raw.controls as Record<string, unknown>[]) ?? []) {
        for (const ar of (control['assessment-requirements'] as Record<string, unknown>[]) ?? []) {
            const requirementId = ar.id as string | undefined;
            if (!requirementId) {
                continue;
            }
            registerRequirement(requirements, catalogs, loc, catalogId, version, requirementId, cleanText(ar.text));
        }
    }
}

function buildIdToPath(catalogsDir: string): Map<string, { category: string; service: string }> {
    const idToPath = new Map<string, { category: string; service: string }>();
    if (!fs.existsSync(catalogsDir)) {
        return idToPath;
    }

    for (const cat of fs.readdirSync(catalogsDir)) {
        const catDir = path.join(catalogsDir, cat);
        if (!fs.statSync(catDir).isDirectory()) continue;
        for (const svc of fs.readdirSync(catDir)) {
            const svcDir = path.join(catDir, svc);
            if (!fs.statSync(svcDir).isDirectory()) continue;
            const metaFile = path.join(svcDir, 'metadata.yaml');
            if (!fs.existsSync(metaFile)) continue;
            const meta = yaml.load(fs.readFileSync(metaFile, 'utf8')) as Record<string, unknown>;
            const id = (meta?.metadata as Record<string, unknown> | undefined)?.id as string | undefined;
            if (id) {
                idToPath.set(id, { category: cat, service: svc });
            }
        }
    }

    return idToPath;
}

export function buildCatalogLookup(siteDir: string): CatalogLookupIndex {
    const catalogsDir = path.resolve(siteDir, '../catalogs');
    const releasesDir = path.join(siteDir, 'src/data/ccc-releases');
    const idToPath = buildIdToPath(catalogsDir);

    const requirements: Record<string, CatalogRequirementRef> = {};
    const catalogs: Record<string, CatalogPathRef> = {};

    if (fs.existsSync(releasesDir)) {
        for (const filename of fs.readdirSync(releasesDir)) {
            const controlsMatch = filename.match(/^(.+)_([A-Za-z0-9][A-Za-z0-9.]*)-controls\.yaml$/);
            if (!controlsMatch) {
                continue;
            }
            const [, metadataId, version] = controlsMatch;
            const loc = idToPath.get(metadataId);
            if (!loc) {
                continue;
            }
            const raw = yaml.load(fs.readFileSync(path.join(releasesDir, filename), 'utf8')) as Record<string, unknown>;
            ingestControlsDocument(raw, loc, metadataId, version, requirements, catalogs);
        }
    }

    if (fs.existsSync(catalogsDir)) {
        for (const [metadataId, loc] of idToPath) {
            const controlsFile = path.join(catalogsDir, loc.category, loc.service, 'controls.yaml');
            if (!fs.existsSync(controlsFile)) {
                continue;
            }
            const metaFile = path.join(catalogsDir, loc.category, loc.service, 'metadata.yaml');
            const meta = yaml.load(fs.readFileSync(metaFile, 'utf8')) as Record<string, unknown>;
            const metaBlock = meta?.metadata as Record<string, unknown> | undefined;
            const version = String(metaBlock?.version ?? 'DEV');
            const raw = yaml.load(fs.readFileSync(controlsFile, 'utf8')) as Record<string, unknown>;
            ingestControlsDocument(raw, loc, metadataId, version, requirements, catalogs);
        }
    }

    for (const catalog of Object.values(catalogs)) {
        catalog.versions.sort(compareVersions);
    }

    return { requirements, catalogs };
}

/** Resolve catalog id from a requirement when only the requirement id is known. */
export function catalogIdForRequirement(requirementId: string): string {
    return extractCatalogId(requirementId);
}
