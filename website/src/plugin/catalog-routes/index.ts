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
}

export interface CatalogVersionData {
  title: string;
  type: 'capabilities' | 'threats' | 'controls';
  version: string;
  category: string;
  service: string;
  entries: CatalogEntry[];
}

export interface CatalogTypeData {
  category: string;
  service: string;
  type: string;
  versionPaths: string[];      // sorted newest-first
  allVersionData: CatalogVersionData[];
}

export interface CatalogServiceInfo {
  slug: string;
  types: Array<{ type: string; typePath: string }>;
}

export interface CatalogTypeIndexEntry {
  category: string;
  service: string;
  typePath: string;
}

export interface CatalogTypeIndexData {
  type: string;
  serviceEntries: CatalogTypeIndexEntry[];
}

export interface CatalogCategoryData {
  category: string;
  services: CatalogServiceInfo[];
}

interface PluginContent {
  versions: Map<string, CatalogVersionData>;
  types: Map<string, CatalogTypeData>;
  categories: Map<string, CatalogCategoryData>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseVersionTag(tag: string): [number, number, boolean, number] {
  const m = tag.replace(/^v/, '').match(/^(\d{4})\.(\d{2})(?:-rc(\d+))?$/);
  if (!m) return [0, 0, false, 0];
  return [+m[1], +m[2], !!m[3], m[3] ? +m[3] : 0];
}

function compareVersionPaths(a: string, b: string): number {
  const [yA, mA, rcA, nA] = parseVersionTag(a.split('/').pop() ?? '');
  const [yB, mB, rcB, nB] = parseVersionTag(b.split('/').pop() ?? '');
  if (yA !== yB) return yB - yA;
  if (mA !== mB) return mB - mA;
  if (rcA !== rcB) return rcA ? 1 : -1;
  return nB - nA;
}

function cleanStr(s: unknown): string {
  return String(s ?? '').replace(/\n+/g, ' ').trim();
}

function mapEntries(
  items: any[],
  type: 'capabilities' | 'threats' | 'controls',
): CatalogEntry[] {
  return items.map((e: any) => ({
    id: String(e.id ?? ''),
    title: cleanStr(e.title),
    ...(type !== 'controls' && e.description ? { description: cleanStr(e.description) } : {}),
    ...(type === 'controls' && e.objective    ? { objective:   cleanStr(e.objective)   } : {}),
  }));
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export default function pluginCatalogRoutes(context: LoadContext): Plugin<PluginContent> {
  return {
    name: 'catalog-routes',

    async loadContent(): Promise<PluginContent> {
      const catalogsDir = path.resolve(context.siteDir, '../catalogs');
      const releasesDir = path.join(context.siteDir, 'src/data/ccc-releases');

      // Build metadataId → { category, service } from source catalog metadata.yaml files
      const idToPath = new Map<string, { category: string; service: string }>();
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
            if (id) idToPath.set(id, { category: cat, service: svc });
          }
        }
      }

      const versions = new Map<string, CatalogVersionData>();

      const addVersion = (
        loc: { category: string; service: string },
        version: string,
        type: CatalogVersionData['type'],
        title: string,
        entries: CatalogEntry[],
      ) => {
        if (!entries.length) return;
        const urlPath = `/catalogs/${loc.category}/${loc.service}/${type}/${version}`;
        versions.set(urlPath, { title, type, version, category: loc.category, service: loc.service, entries });
      };

      if (fs.existsSync(releasesDir)) {
        for (const filename of fs.readdirSync(releasesDir)) {
          if (!filename.endsWith('.yaml')) continue;

          // Pattern 1: type-specific Gemara files  e.g. CCC.Core_v2025.10-capabilities.yaml  or CCC.GenAI_DEV-capabilities.yaml
          const typeMatch = filename.match(/^(.+)_([A-Za-z0-9][A-Za-z0-9.]*)-(capabilities|threats|controls)\.yaml$/);
          if (typeMatch) {
            const [, metadataId, version, type] = typeMatch;
            const loc = idToPath.get(metadataId);
            if (!loc) continue;
            const raw = yaml.load(fs.readFileSync(path.join(releasesDir, filename), 'utf8')) as Record<string, any>;
            const title = cleanStr(raw?.title ?? raw?.metadata?.title ?? metadataId);
            const entries = mapEntries(raw?.[type] ?? [], type as CatalogVersionData['type']);
            addVersion(loc, version, type as CatalogVersionData['type'], title, entries);
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
            );
            addVersion(loc, version, 'threats',
              `${baseTitle} Threats`,
              mapEntries(raw.threats ?? [], 'threats'),
            );
            // Controls are nested under control-families[].controls[]
            const families: any[] = raw['control-families'] ?? [];
            const controls = families.flatMap((cf: any) => cf.controls ?? []);
            addVersion(loc, version, 'controls',
              `${baseTitle} Controls`,
              mapEntries(controls, 'controls'),
            );
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

          for (const typeName of ['capabilities', 'threats', 'controls'] as const) {
            const typeFile = path.join(svcDir, `${typeName}.yaml`);
            if (!fs.existsSync(typeFile)) continue;
            const raw = yaml.load(fs.readFileSync(typeFile, 'utf8')) as Record<string, any>;
            const items: any[] = Array.isArray(raw?.[typeName]) ? raw[typeName] : [];
            if (items.length === 0) continue;
            const typeLabel = typeName.charAt(0).toUpperCase() + typeName.slice(1);
            addVersion(loc, 'DEV', typeName, `${baseTitle} ${typeLabel}`, mapEntries(items, typeName));
          }
        }
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
          services: Array.from(svcMap.entries()).map(([slug, typeSet]) => ({
            slug,
            types: TYPE_ORDER
              .filter(t => typeSet.has(t))
              .map(type => ({ type, typePath: `/catalogs/${cat}/${slug}/${type}` })),
          })),
        });
      }

      return { versions, types, categories };
    },

    async contentLoaded({ content: { versions, types, categories }, actions }) {
      const { createData, addRoute } = actions;
      const added = new Set<string>();

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

      // Build type index files first so they can be reused across routes
      const typeIndexFiles = new Map<string, string>();
      for (const typeName of ['capabilities', 'threats', 'controls'] as const) {
        const serviceEntries: CatalogTypeIndexEntry[] = [];
        for (const [typePath, data] of types) {
          if (data.type === typeName) {
            serviceEntries.push({ category: data.category, service: data.service, typePath });
          }
        }
        const indexData: CatalogTypeIndexData = { type: typeName, serviceEntries };
        const dataFile = await createData(
          `catalog-type-index-${typeName}.json`,
          JSON.stringify(indexData),
        );
        typeIndexFiles.set(typeName, dataFile);
      }

      // Version routes — include type index so sidebar stays filtered
      for (const [urlPath, data] of versions) {
        const dataFile = await createData(
          `catalog-version${urlPath.replace(/\//g, '-')}.json`,
          JSON.stringify(data),
        );
        const modules: Record<string, string> = { catalogVersionData: dataFile };
        const typeIndexFile = typeIndexFiles.get(data.type);
        if (typeIndexFile) modules.catalogTypeIndexData = typeIndexFile;
        add(urlPath, modules);
      }

      // Type routes — include type index so sidebar stays filtered
      for (const [typePath, data] of types) {
        const dataFile = await createData(
          `catalog-type${typePath.replace(/\//g, '-')}.json`,
          JSON.stringify(data),
        );
        const modules: Record<string, string> = { catalogTypeData: dataFile };
        const typeIndexFile = typeIndexFiles.get(data.type);
        if (typeIndexFile) modules.catalogTypeIndexData = typeIndexFile;
        add(typePath, modules);
      }

      // Category routes — /catalogs/<cat> with all services
      for (const [cat, data] of categories) {
        const catDataFile = await createData(
          `catalog-category-${cat}.json`,
          JSON.stringify(data),
        );
        add(`/catalogs/${cat}`, { catalogCategoryData: catDataFile });

        // Service routes — /catalogs/<cat>/<svc> with single-service slice
        for (const svc of data.services) {
          const svcData: CatalogCategoryData = { category: cat, services: [svc] };
          const svcDataFile = await createData(
            `catalog-category-${cat}-${svc.slug}.json`,
            JSON.stringify(svcData),
          );
          add(`/catalogs/${cat}/${svc.slug}`, { catalogCategoryData: svcDataFile });
        }
      }

      // Type overview routes — /capabilities, /threats, /controls
      for (const typeName of ['capabilities', 'threats', 'controls'] as const) {
        addRoute({
          path: `/${typeName}`,
          component: '@site/src/components/Catalogs/CatalogPage',
          exact: true,
          modules: { catalogTypeIndexData: typeIndexFiles.get(typeName)! },
        });
      }

      console.log(`catalog-routes: registered ${added.size} routes`);
    },
  };
}
