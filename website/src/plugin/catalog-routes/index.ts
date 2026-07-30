import fs from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import type { LoadContext, Plugin } from '@docusaurus/types';

// ── Shared types (mirrored in component files) ────────────────────────────────

export interface CatalogEntry {
  id: string;
  title: string;
  description?: string;
  objective?: string;
  threatMappings?: string[];
  externalMappingsCount?: number;
  capabilityMappingsCount?: number;
  controlMappings?: string[];
  family?: string;
  threatMappingsCount?: number;
  guidelineMappingsCount?: number;
  assessmentRequirementsCount?: number;
  capabilityRefs?: string[];
  threatRefs?: string[];
  assessmentRequirements?: CatalogAssessmentRequirement[];
  guidelineMappings?: CatalogGuidelineMapping[];
  externalMappings?: CatalogGuidelineMapping[];
}

export interface CatalogImport {
  id: string;
  title: string;
  category?: string;
  service?: string;
}

export interface CatalogAssessmentRequirement {
  id: string;
  text: string;
  applicability?: string[];
}

export interface CatalogGuidelineMapping {
  framework: string;
  id: string;
  /** Mapping relationship (e.g. relates-to) when sourced from a Gemara MappingDocument. */
  relationship?: string;
  remarks?: string;
  url?: string;
}

export interface CatalogRelatedEntry {
  id: string;
  title: string;
  description?: string;
  url: string;
}

export interface CatalogEntryDetailData {
  category: string;
  service: string;
  version: string;
  type: 'capabilities' | 'threats' | 'controls';
  entry: CatalogEntry;
  relatedCapabilities?: CatalogRelatedEntry[];
  relatedThreats?: CatalogRelatedEntry[];
  relatedControls?: CatalogRelatedEntry[];
}

// Flat, global cross-reference for a single control's assessment requirement —
// exposed as plugin global data so other plugins (e.g. cfi-pages) can link to
// /catalogs/* control pages without depending on the ccc-pages data model.
export interface CatalogAssessmentRequirementRef {
  id: string;
  text: string;
  controlId: string;
  controlTitle: string;
  url: string;
}

export interface CatalogStructureEntry {
  slug: string;
  services: Array<{ slug: string; title: string }>;
}

export interface CatalogTotalData {
  controls: number;
  threats: number;
  capabilities: number;
}

export interface CatalogGlobalData {
  assessmentRequirements: CatalogAssessmentRequirementRef[];
  catalogStructure: CatalogStructureEntry[];
  totals: CatalogTotalData;
}

export interface CatalogVersionData {
  title: string;
  type: 'capabilities' | 'threats' | 'controls';
  version: string;
  category: string;
  service: string;
  entries: CatalogEntry[];
  imports: CatalogImport[];
}

export interface CatalogTypeData {
  category: string;
  service: string;
  type: string;
  versionPaths: string[];      // sorted newest-first
  allVersionData: CatalogVersionData[];
}

export interface CatalogContributor {
  name: string;
  'github-id'?: string;
  company?: string;
}

export interface CatalogReleaseSummary {
  version: string;
  releaseManager?: CatalogContributor;
  contributors?: CatalogContributor[];
  capabilitiesCount: number;
  threatsCount: number;
  controlsCount: number;
  typePaths: { capabilities?: string; threats?: string; controls?: string };
}

export interface CatalogCspService {
  provider: string;
  service: string;
  url: string;
}

export interface CatalogMappingReference {
  id: string;
  title: string;
  version?: string;
  description?: string;
  url?: string;
}

export interface CatalogServiceInfo {
  slug: string;
  title: string;
  description?: string;
  exampleCspServices?: CatalogCspService[];
  mappingReferences?: CatalogMappingReference[];
  types: Array<{ type: string; typePath: string }>;
  releases: CatalogReleaseSummary[];
}

export interface CatalogCategoryData {
  category: string;
  services: CatalogServiceInfo[];
}

interface PluginContent {
  versions: Map<string, CatalogVersionData>;
  types: Map<string, CatalogTypeData>;
  categories: Map<string, CatalogCategoryData>;
  entryDetails: Map<string, CatalogEntryDetailData>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseVersionTag(tag: string): [number, number, boolean, number] {
  const m = tag.replace(/^v/, '').match(/^(\d{4})\.(\d{2})(?:-rc(\d+))?$/);
  if (!m) return [0, 0, false, 0];
  return [+m[1], +m[2], !!m[3], m[3] ? +m[3] : 0];
}

function compareVersionTags(a: string, b: string): number {
  const [yA, mA, rcA, nA] = parseVersionTag(a);
  const [yB, mB, rcB, nB] = parseVersionTag(b);
  if (yA !== yB) return yB - yA;
  if (mA !== mB) return mB - mA;
  if (rcA !== rcB) return rcA ? 1 : -1;
  return nB - nA;
}

function compareVersionPaths(a: string, b: string): number {
  return compareVersionTags(a.split('/').pop() ?? '', b.split('/').pop() ?? '');
}

function cleanStr(s: unknown): string {
  return String(s ?? '').replace(/\n+/g, ' ').trim();
}

function mapEntries(
  items: any[],
  type: 'capabilities' | 'threats' | 'controls',
  threatDocMappings?: Map<string, ThreatDocMappings>,
): CatalogEntry[] {
  return items.map((e: any) => ({
    id: String(e.id ?? ''),
    title: cleanStr(e.title),
    ...(type !== 'controls' && e.description ? { description: cleanStr(e.description) } : {}),
    ...(type === 'controls' && e.objective    ? { objective:   cleanStr(e.objective)   } : {}),
    ...(type === 'threats' ? {
      // External mappings live in standalone Gemara MappingDocuments; the inline
      // field only survives in legacy all-in-one (-MP) release files.
      externalMappingsCount:
        threatDocMappings?.get(String(e.id ?? ''))?.docCount ?? (e['external-mappings'] ?? []).length,
      capabilityMappingsCount: (e.capabilities ?? []).length,
      capabilityRefs: extractRefIds(e.capabilities),
      externalMappings:
        threatDocMappings?.get(String(e.id ?? ''))?.mappings ?? extractGuidelineMappings(e['external-mappings']),
    } : {}),
    ...(type === 'controls' ? {
      family: cleanStr(e._familyTitle ?? e.group ?? ''),
      threatMappingsCount: sumMappingEntries(e.threats),
      guidelineMappingsCount: sumMappingEntries(e.guidelines),
      assessmentRequirementsCount: (e['assessment-requirements'] ?? []).length,
      threatRefs: extractRefIds(e.threats),
      assessmentRequirements: ((e['assessment-requirements'] ?? []) as any[]).map((ar) => ({
        id: String(ar?.id ?? ''),
        text: cleanStr(ar?.text),
        applicability: (ar?.applicability ?? []) as string[],
      })),
      guidelineMappings: extractGuidelineMappings(e.guidelines),
    } : {}),
  }));
}

function mapImports(
  items: any[],
  idToPath: Map<string, { category: string; service: string }>
): CatalogImport[] {
  var allImports : Array<any> = [];
  items?.forEach((item) => {
    allImports = allImports.concat(item?.entries);
  });

  //Using the import ID with the idToPath map to get the category/service used in the entries url
  allImports.forEach((entry) => {
    var [categoryId , serviceId , ] = entry?.['reference-id'].split('.');
    const metadata = idToPath.get(categoryId + '.' + serviceId);
    entry.category = metadata?.category;
    entry.service = metadata?.service;    
  });

  return allImports.map((entry: any) => ({
    id: String(entry?.['reference-id'] ?? ''),
    title: cleanStr(entry?.['remarks'] ?? 'default remarks title'),
    category: cleanStr(entry?.['category'] ?? 'unknown_category'),
    service: cleanStr(entry?.['service'] ?? 'unknown_service'),
  }));
}


function sumMappingEntries(mappingGroups: any[] | undefined): number {
  return (mappingGroups ?? []).reduce((sum: number, m: any) => sum + (m.entries?.length ?? 0), 0);
}

function extractGuidelineMappings(mappingGroups: any[] | undefined): CatalogGuidelineMapping[] {
  return (mappingGroups ?? []).flatMap((g: any) =>
    (g.entries ?? []).map((entry: any) => {
      const framework = String(g?.['reference-id'] ?? '');
      const id = String(entry?.['reference-id'] ?? '');
      return {
        framework,
        id,
        remarks: cleanStr(entry?.remarks),
        url: getExternalFrameworkUrl(framework, id) ?? undefined,
      };
    }),
  );
}

// Known external-framework URL generators (MITRE ATT&CK, NIST, CSA CCM, etc.) for
// linking guideline/external mapping IDs back to their source standard.
function getExternalFrameworkUrl(framework: string, entryId: string): string | null {
  const urlGenerators: Record<string, (id: string) => string> = {
    // Sub-techniques (T1548.004) live at /techniques/T1548/004
    'MITRE-ATT&CK': (id) => `https://attack.mitre.org/techniques/${id.replace('.', '/')}`,
    'MITRE-ATLAS': (id) => `https://atlas.mitre.org/techniques/${id}`,
    CWE: (id) => `https://cwe.mitre.org/data/definitions/${id.replace(/^CWE-/, '')}.html`,
    'NIST-CSF': (id) => `https://csrc.nist.gov/Projects/cybersecurity-framework/glossary#term-${id.toLowerCase()}`,
    NIST_800_53: (id) => `https://csrc.nist.gov/projects/cprt/catalog#/cprt/framework/version/SP_800_53_5_2_0/home?keyword=${id}`,
    ISO_27001: () => `https://www.iso.org/standard/27001`,
    CCM: () => `https://cloudsecurityalliance.org/artifacts/cloud-controls-matrix-v4/`,
    CCMv4: () => `https://cloudsecurityalliance.org/artifacts/cloud-controls-matrix-v4/`,
  };

  const generate = urlGenerators[framework];
  return generate ? generate(entryId) : null;
}

function extractRefIds(mappingGroups: any[] | undefined): string[] {
  return (mappingGroups ?? []).flatMap((m: any) =>
    (m.entries ?? []).map((e: any) => String(e?.['reference-id'] ?? '')),
  ).filter(Boolean);
}

// Per-threat data extracted from standalone Gemara MappingDocuments: the number of
// documents referencing the threat (one document per target framework — the same
// granularity the retired inline external-mappings count had) and the flattened
// mapping rows for the entry detail page.
interface ThreatDocMappings {
  docCount: number;
  mappings: CatalogGuidelineMapping[];
}

function collectThreatMappingDocs(
  docs: any[],
  into = new Map<string, ThreatDocMappings>(),
): Map<string, ThreatDocMappings> {
  for (const doc of docs) {
    if (doc?.['source-reference']?.['entry-type'] !== 'Threat') continue;
    const framework = String(doc?.['target-reference']?.['reference-id'] ?? '');
    for (const mapping of doc.mappings ?? []) {
      const source = String(mapping?.source ?? '');
      const targets: any[] = mapping?.targets ?? [];
      if (!source || !targets.length) continue;
      if (!into.has(source)) into.set(source, { docCount: 0, mappings: [] });
      const rec = into.get(source)!;
      rec.docCount += 1;
      for (const target of targets) {
        const id = String(target?.['entry-id'] ?? '');
        if (!id) continue;
        rec.mappings.push({
          framework,
          id,
          relationship: String(mapping?.relationship ?? '') || undefined,
          remarks: cleanStr(target?.remarks),
          url: getExternalFrameworkUrl(framework, id) ?? undefined,
        });
      }
    }
  }
  return into;
}

// Reads every MappingDocument in a source catalog's mappings/ directory.
function loadSourceMappingDocs(svcDir: string): any[] {
  const mappingsDir = path.join(svcDir, 'mappings');
  if (!fs.existsSync(mappingsDir)) return [];
  return fs.readdirSync(mappingsDir)
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    .map((f) => yaml.load(fs.readFileSync(path.join(mappingsDir, f), 'utf8')));
}

// Resolves each control's family/group title using a top-level `groups` lookup
// (id -> title) when present, falling back to the raw `group` string itself.
function withControlFamilyTitles(items: any[], groups: any[] | undefined): any[] {
  const groupsMap = new Map((groups ?? []).map((g: any) => [g.id, g.title]));
  return items.map((c: any) => ({ ...c, _familyTitle: groupsMap.get(c.group) ?? c.group ?? '' }));
}

// Builds a map of capabilityId -> threat ids that reference it, from a raw threats array
function extractThreatCapabilityRefs(items: any[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const threat of items) {
    const threatId = String(threat?.id ?? '');
    if (!threatId) continue;
    const capRefs: string[] = (threat.capabilities ?? []).flatMap((c: any) =>
      (c.entries ?? []).map((e: any) => String(e?.['reference-id'] ?? '')),
    ).filter(Boolean);
    for (const capId of capRefs) {
      if (!map.has(capId)) map.set(capId, []);
      map.get(capId)!.push(threatId);
    }
  }
  return map;
}

// Builds a map of threatId -> control ids that reference it, from a raw controls array
function extractControlThreatRefs(items: any[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const control of items) {
    const controlId = String(control?.id ?? '');
    if (!controlId) continue;
    const threatRefs = new Set<string>(
      (control.threats ?? []).flatMap((t: any) =>
        (t.entries ?? []).map((e: any) => String(e?.['reference-id'] ?? '')),
      ).filter(Boolean),
    );
    for (const threatId of threatRefs) {
      if (!map.has(threatId)) map.set(threatId, []);
      map.get(threatId)!.push(controlId);
    }
  }
  return map;
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export default function pluginCatalogRoutes(context: LoadContext): Plugin<PluginContent> {
  return {
    name: 'catalog-routes',

    async loadContent(): Promise<PluginContent> {
      const catalogsDir = path.resolve(context.siteDir, '../catalogs');
      const releasesDir = path.join(context.siteDir, 'src/data/ccc-releases');

      // Build metadataId → { category, service } and cat/svc → title from source catalog metadata.yaml files
      const idToPath = new Map<string, { category: string; service: string }>();
      const svcTitles = new Map<string, string>();
      const svcDescriptions = new Map<string, string>();
      const svcCspServices = new Map<string, CatalogCspService[]>();
      const svcMappingRefs = new Map<string, CatalogMappingReference[]>();
      if (fs.existsSync(catalogsDir)) {
        for (const cat of fs.readdirSync(catalogsDir)) {
          const catDir = path.join(catalogsDir, cat);
          if (!fs.statSync(catDir).isDirectory()) continue;
          for (const svc of fs.readdirSync(catDir)) {
            const svcDir = path.join(catDir, svc);
            if (!fs.statSync(svcDir).isDirectory()) continue;
            const metaFile = path.join(svcDir, 'metadata.yaml');
            if (!fs.existsSync(metaFile)) continue;
            const meta = yaml.load(fs.readFileSync(metaFile, 'utf8')) as Record<string, any>;
            const id = meta?.metadata?.id as string | undefined;
            const title = cleanStr(meta?.metadata?.title ?? '');
            const description = cleanStr(meta?.metadata?.description ?? '');
            const cspServices = (meta?.metadata?.['example-csp-services'] ?? []) as CatalogCspService[];
            const mappingRefs = (meta?.metadata?.['mapping-references'] ?? []) as CatalogMappingReference[];
            if (id) {
              idToPath.set(id, { category: cat, service: svc });
              if (title) svcTitles.set(`${cat}/${svc}`, title);
              if (description) svcDescriptions.set(`${cat}/${svc}`, description);
              if (cspServices.length) svcCspServices.set(`${cat}/${svc}`, cspServices);
              if (mappingRefs.length) svcMappingRefs.set(`${cat}/${svc}`, mappingRefs);
            }
          }
        }
      }

      const versions = new Map<string, CatalogVersionData>();
      // category/service/version -> (capabilityId -> threat ids referencing it)
      const threatCapMaps = new Map<string, Map<string, string[]>>();
      // category/service/version -> (threatId -> control ids referencing it)
      const controlThreatMaps = new Map<string, Map<string, string[]>>();
      // category/service/version -> { releaseManager, contributors }
      const releaseDetailsMap = new Map<string, { releaseManager?: CatalogContributor; contributors?: CatalogContributor[] }>();

      const addVersion = (
        loc: { category: string; service: string },
        version: string,
        type: CatalogVersionData['type'],
        title: string,
        entries: CatalogEntry[],
        imports: CatalogImport[],
      ) => {
        const urlPath = `/catalogs/${loc.category}/${loc.service}/${type}/${version}`;
        versions.set(urlPath, { title, type, version, category: loc.category, service: loc.service, entries, imports });
      };

      // Pre-scan standalone MappingDocument files (<id>_<version>-mapping.<doc>.yaml)
      // so external mappings are ready when the threats files are processed below.
      const MAPPING_FILE = /^(.+)_([A-Za-z0-9][A-Za-z0-9.]*)-mapping\..+\.yaml$/;
      const releaseDocMappings = new Map<string, Map<string, ThreatDocMappings>>();
      if (fs.existsSync(releasesDir)) {
        for (const filename of fs.readdirSync(releasesDir)) {
          const m = filename.match(MAPPING_FILE);
          if (!m) continue;
          const [, metadataId, version] = m;
          const key = `${metadataId}_${version}`;
          if (!releaseDocMappings.has(key)) releaseDocMappings.set(key, new Map());
          const doc = yaml.load(fs.readFileSync(path.join(releasesDir, filename), 'utf8'));
          collectThreatMappingDocs([doc], releaseDocMappings.get(key)!);
        }
      }

      if (fs.existsSync(releasesDir)) {
        for (const filename of fs.readdirSync(releasesDir)) {
          if (!filename.endsWith('.yaml')) continue;
          if (MAPPING_FILE.test(filename)) continue; // handled in the pre-scan above

          // Release-details files  e.g. CCC.Core_v2025.10-release-details.yaml  or CCC.KeyMgmt_v2025.07-MP-release-details.yaml
          const detailsMatch = filename.match(/^(.+)_([A-Za-z0-9][A-Za-z0-9.]*)-release-details\.yaml$/)
            ?? filename.match(/^(.+)_(v.+?-MP)-release-details\.yaml$/);
          if (detailsMatch) {
            const [, metadataId, version] = detailsMatch;
            const loc = idToPath.get(metadataId);
            if (loc) {
              const raw = yaml.load(fs.readFileSync(path.join(releasesDir, filename), 'utf8')) as any[];
              const details = Array.isArray(raw) ? raw[0] : undefined;
              if (details) {
                releaseDetailsMap.set(`${loc.category}/${loc.service}/${version}`, {
                  releaseManager: details['release-manager'],
                  contributors: details.contributors,
                });
              }
            }
            continue;
          }

          // Pattern 1: type-specific Gemara files  e.g. CCC.Core_v2025.10-capabilities.yaml  or CCC.GenAI_DEV-capabilities.yaml
          const typeMatch = filename.match(/^(.+)_([A-Za-z0-9][A-Za-z0-9.]*)-(capabilities|threats|controls)\.yaml$/);
          if (typeMatch) {
            const [, metadataId, version, type] = typeMatch;
            const loc = idToPath.get(metadataId);
            if (!loc) continue;
            const raw = yaml.load(fs.readFileSync(path.join(releasesDir, filename), 'utf8')) as Record<string, any>;
            const title = cleanStr(raw?.title ?? raw?.metadata?.title ?? metadataId);
            const rawItems = raw?.[type] ?? [];
            const items = type === 'controls' ? withControlFamilyTitles(rawItems, raw?.groups) : rawItems;
            const entries = mapEntries(
              items,
              type as CatalogVersionData['type'],
              type === 'threats' ? releaseDocMappings.get(`${metadataId}_${version}`) : undefined,
            );
            const imports: CatalogImport[] = mapImports(raw.imports, idToPath);
            addVersion(loc, version, type as CatalogVersionData['type'], title, entries, imports);
            if (type === 'threats') {
              threatCapMaps.set(`${loc.category}/${loc.service}/${version}`, extractThreatCapabilityRefs(items));
            }
            if (type === 'controls') {
              controlThreatMaps.set(`${loc.category}/${loc.service}/${version}`, extractControlThreatRefs(items));
            }
            continue;
          }

          // Pattern 2: all-in-one migration-preview files  e.g. CCC.KeyMgmt_v2025.07-MP.yaml
          const mpMatch = filename.match(/^(.+)_(v.+?-MP)\.yaml$/);
          if (mpMatch) {
            const [, metadataId, version] = mpMatch;
            const loc = idToPath.get(metadataId);
            if (!loc) continue;
            const raw = yaml.load(fs.readFileSync(path.join(releasesDir, filename), 'utf8')) as Record<string, any>;
            const baseTitle = cleanStr(raw?.metadata?.title ?? raw?.title ?? metadataId);

            addVersion(loc, version, 'capabilities',
              `${baseTitle} Capabilities`,
              mapEntries(raw.capabilities ?? [], 'capabilities'),
              mapImports(raw.imports ?? [], idToPath),
            );
            addVersion(loc, version, 'threats',
              `${baseTitle} Threats`,
              mapEntries(raw.threats ?? [], 'threats'),
              mapImports(raw.imports ?? [], idToPath),
            );
            threatCapMaps.set(`${loc.category}/${loc.service}/${version}`, extractThreatCapabilityRefs(raw.threats ?? []));
            // Controls are nested under control-families[].controls[]
            const families: any[] = raw['control-families'] ?? [];
            const controls = families.flatMap((cf: any) =>
              (cf.controls ?? []).map((c: any) => ({ ...c, _familyTitle: cf.title ?? '' })),
            );
            addVersion(loc, version, 'controls',
              `${baseTitle} Controls`,
              mapEntries(controls, 'controls'),
              mapImports(raw.imports ?? [], idToPath),
            );
            controlThreatMaps.set(`${loc.category}/${loc.service}/${version}`, extractControlThreatRefs(controls));
          }
        }
      }

      // Pattern 3: raw source files in catalogs/<cat>/<svc>/{capabilities,threats,controls}.yaml
      // Used for services that have no formal release yet — registered as version "DEV"
      if (fs.existsSync(catalogsDir)) {
        for (const [, loc] of idToPath) {
          const svcDir = path.join(catalogsDir, loc.category, loc.service);
          const metaFile = path.join(svcDir, 'metadata.yaml');
          const meta = yaml.load(fs.readFileSync(metaFile, 'utf8')) as Record<string, any>;
          const baseTitle = cleanStr(meta?.metadata?.title ?? loc.service);
          const sourceDocMappings = collectThreatMappingDocs(loadSourceMappingDocs(svcDir));

          for (const typeName of ['capabilities', 'threats', 'controls'] as const) {
            const typeFile = path.join(svcDir, `${typeName}.yaml`);
            if (!fs.existsSync(typeFile)) continue;
            const raw = yaml.load(fs.readFileSync(typeFile, 'utf8')) as Record<string, any>;
            const rawItems: any[] = Array.isArray(raw?.[typeName]) ? raw[typeName] : [];
            const rawImports: any[] = Array.isArray(raw?.imports) ? raw.imports : [];
            if (rawItems.length === 0 && rawImports.length === 0)  continue;
            const items = typeName === 'controls' ? withControlFamilyTitles(rawItems, raw?.groups) : rawItems;
            const typeLabel = typeName.charAt(0).toUpperCase() + typeName.slice(1);
            addVersion(loc, 'DEV', typeName, `${baseTitle} ${typeLabel}`,
              mapEntries(items, typeName, typeName === 'threats' ? sourceDocMappings : undefined),
              mapImports(rawImports, idToPath));
            if (typeName === 'threats') {
              threatCapMaps.set(`${loc.category}/${loc.service}/DEV`, extractThreatCapabilityRefs(items));
            }
            if (typeName === 'controls') {
              controlThreatMaps.set(`${loc.category}/${loc.service}/DEV`, extractControlThreatRefs(items));
            }
          }
        }
      }

      // Attach reverse mappings: threat -> capability (onto capabilities entries) and control -> threat (onto threats entries)
      for (const data of versions.values()) {
        const key = `${data.category}/${data.service}/${data.version}`;
        if (data.type === 'capabilities') {
          const capMap = threatCapMaps.get(key);
          if (!capMap) continue;
          for (const entry of data.entries) {
            const refs = capMap.get(entry.id);
            if (refs) entry.threatMappings = refs;
          }
        } else if (data.type === 'threats') {
          const ctrlMap = controlThreatMaps.get(key);
          if (!ctrlMap) continue;
          for (const entry of data.entries) {
            const refs = ctrlMap.get(entry.id);
            if (refs) entry.controlMappings = refs;
          }
        }
      }

      // Build global id -> { entry, url } indices per type, for resolving cross-catalog references
      const globalIndex: Record<CatalogVersionData['type'], Map<string, { entry: CatalogEntry; url: string }>> = {
        capabilities: new Map(),
        threats: new Map(),
        controls: new Map(),
      };
      for (const [urlPath, data] of versions) {
        for (const entry of data.entries) {
          if (!globalIndex[data.type].has(entry.id)) {
            globalIndex[data.type].set(entry.id, { entry, url: `${urlPath}/${entry.id}` });
          }
        }
      }

      const resolveRefs = (ids: string[] | undefined, index: Map<string, { entry: CatalogEntry; url: string }>): CatalogRelatedEntry[] =>
        (ids ?? []).map((id) => {
          const found = index.get(id);
          return found
            ? { id, title: found.entry.title, description: found.entry.description ?? found.entry.objective, url: found.url }
            : { id, title: id, url: '#' };
        });

      // Build per-entry detail data, keyed by the entry's own url path
      const entryDetails = new Map<string, CatalogEntryDetailData>();
      for (const [urlPath, data] of versions) {
        for (const entry of data.entries) {
          const detail: CatalogEntryDetailData = {
            category: data.category,
            service: data.service,
            version: data.version,
            type: data.type,
            entry,
          };
          if (data.type === 'capabilities') {
            detail.relatedThreats = resolveRefs(entry.threatMappings, globalIndex.threats);
          } else if (data.type === 'threats') {
            detail.relatedCapabilities = resolveRefs(entry.capabilityRefs, globalIndex.capabilities);
            detail.relatedControls = resolveRefs(entry.controlMappings, globalIndex.controls);
          } else if (data.type === 'controls') {
            detail.relatedThreats = resolveRefs(entry.threatRefs, globalIndex.threats);
            // Related capabilities for a control are derived transitively: control -> its threats -> those threats' capabilities
            const capIds = new Set<string>();
            for (const threatId of entry.threatRefs ?? []) {
              for (const capId of globalIndex.threats.get(threatId)?.entry.capabilityRefs ?? []) {
                capIds.add(capId);
              }
            }
            detail.relatedCapabilities = resolveRefs([...capIds], globalIndex.capabilities);
          }
          entryDetails.set(`${urlPath}/${entry.id}`, detail);
        }
      }

      // Build per-service release summaries: category/service -> version -> summary
      const releaseSummaries = new Map<string, Map<string, CatalogReleaseSummary>>();
      for (const [urlPath, data] of versions) {
        const svcKey = `${data.category}/${data.service}`;
        if (!releaseSummaries.has(svcKey)) releaseSummaries.set(svcKey, new Map());
        const verMap = releaseSummaries.get(svcKey)!;
        if (!verMap.has(data.version)) {
          const details = releaseDetailsMap.get(`${svcKey}/${data.version}`);
          verMap.set(data.version, {
            version: data.version,
            releaseManager: details?.releaseManager,
            contributors: details?.contributors,
            capabilitiesCount: 0,
            threatsCount: 0,
            controlsCount: 0,
            typePaths: {},
          });
        }
        const summary = verMap.get(data.version)!;
        summary[`${data.type}Count` as 'capabilitiesCount' | 'threatsCount' | 'controlsCount'] = data.entries.length + data.imports.length;
        summary.typePaths[data.type] = urlPath;
      }

      // Build type-level data: group version paths by /catalogs/<cat>/<svc>/<type>
      const typeVersionPaths = new Map<string, string[]>();
      for (const urlPath of versions.keys()) {
        const parts = urlPath.split('/').filter(Boolean);
        const typePath = `/catalogs/${parts[1]}/${parts[2]}/${parts[3]}`;
        if (!typeVersionPaths.has(typePath)) typeVersionPaths.set(typePath, []);
        typeVersionPaths.get(typePath)!.push(urlPath);
      }

      const types = new Map<string, CatalogTypeData>();
      for (const [typePath, vPaths] of typeVersionPaths) {
        const sorted = [...vPaths].sort(compareVersionPaths);
        const parts = typePath.split('/').filter(Boolean);
        types.set(typePath, {
          category: parts[1],
          service:  parts[2],
          type:     parts[3],
          versionPaths: sorted,
          allVersionData: sorted.map(vPath => versions.get(vPath)!).filter(Boolean),
        });
      }

      // Build category-level data — seed every known service so all get a route
      const catSvcTypes = new Map<string, Map<string, Set<string>>>();
      for (const { category: cat, service: svc } of idToPath.values()) {
        if (!catSvcTypes.has(cat)) catSvcTypes.set(cat, new Map());
        if (!catSvcTypes.get(cat)!.has(svc)) catSvcTypes.get(cat)!.set(svc, new Set());
      }
      for (const urlPath of versions.keys()) {
        const parts = urlPath.split('/').filter(Boolean);
        const [, cat, svc, type] = parts;
        catSvcTypes.get(cat)?.get(svc)?.add(type);
      }

      const TYPE_ORDER = ['capabilities', 'threats', 'controls'];
      const categories = new Map<string, CatalogCategoryData>();
      for (const [cat, svcMap] of catSvcTypes) {
        categories.set(cat, {
          category: cat,
          services: Array.from(svcMap.entries()).map(([slug, typeSet]) => {
            const releases = [...(releaseSummaries.get(`${cat}/${slug}`)?.values() ?? [])]
              .sort((a, b) => compareVersionTags(a.version, b.version));
            return {
              slug,
              title: svcTitles.get(`${cat}/${slug}`) ?? slug,
              description: svcDescriptions.get(`${cat}/${slug}`),
              exampleCspServices: svcCspServices.get(`${cat}/${slug}`),
              mappingReferences: svcMappingRefs.get(`${cat}/${slug}`),
              types: TYPE_ORDER
                .filter(t => typeSet.has(t))
                .map(type => ({ type, typePath: `/catalogs/${cat}/${slug}/${type}` })),
              releases,
            };
          }),
        });
      }

      return { versions, types, categories, entryDetails };
    },

    async contentLoaded({ content: { versions, types, categories, entryDetails }, actions }) {
      const { createData, addRoute, setGlobalData } = actions;
      const added = new Set<string>();

      // Expose a flat assessment-requirement index as global data so other plugins
      // (e.g. cfi-pages) can cross-link to /catalogs/* control pages directly.
      const assessmentRequirements: CatalogAssessmentRequirementRef[] = [];
      for (const [entryUrl, detail] of entryDetails) {
        if (detail.type !== 'controls') continue;
        for (const ar of detail.entry.assessmentRequirements ?? []) {
          assessmentRequirements.push({
            id: ar.id,
            text: ar.text,
            controlId: detail.entry.id,
            controlTitle: detail.entry.title,
            url: `${entryUrl}#${ar.id}`,
          });
        }
      }
      const catalogStructure: CatalogStructureEntry[] = Array.from(categories.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([catSlug, catData]) => ({
          slug: catSlug,
          services: catData.services.map((svc) => ({ slug: svc.slug, title: svc.title })),
        }));
      const totals: CatalogTotalData = {threats: 0, controls: 0, capabilities: 0};
      for (const [, data] of versions) {
        totals[data.type] += data.entries.length;
      }

      setGlobalData({ assessmentRequirements, catalogStructure, totals } satisfies CatalogGlobalData);

      const add = (routePath: string, modules?: Record<string, string>) => {
        if (added.has(routePath)) return;
        added.add(routePath);
        addRoute({
          path: routePath,
          component: '@site/src/components/Catalogs/CatalogPage',
          exact: true,
          ...(modules && { modules }),
        });
      };

      // Version routes
      for (const [urlPath, data] of versions) {
        const dataFile = await createData(
          `catalog-version${urlPath.replace(/\//g, '-')}.json`,
          JSON.stringify(data),
        );
        add(urlPath, { catalogVersionData: dataFile });
      }

      // Entry routes — /catalogs/<cat>/<svc>/<type>/<version>/<entryId>
      for (const [entryUrlPath, detail] of entryDetails) {
        const dataFile = await createData(
          `catalog-entry${entryUrlPath.replace(/\//g, '-')}.json`,
          JSON.stringify(detail),
        );
        add(entryUrlPath, { catalogEntryData: dataFile });
      }

      // Type routes
      for (const [typePath, data] of types) {
        const dataFile = await createData(
          `catalog-type${typePath.replace(/\//g, '-')}.json`,
          JSON.stringify(data),
        );
        add(typePath, { catalogTypeData: dataFile });
      }

      // Service routes — /catalogs/<cat>/<svc>
      for (const [cat, data] of categories) {
        for (const svc of data.services) {
          const svcData: CatalogCategoryData = { category: cat, services: [svc] };
          const svcDataFile = await createData(
            `catalog-category-${cat}-${svc.slug}.json`,
            JSON.stringify(svcData),
          );
          add(`/catalogs/${cat}/${svc.slug}`, { catalogCategoryData: svcDataFile });
        }
      }

      console.log(`catalog-routes: registered ${added.size} routes`);
    },
  };
}
