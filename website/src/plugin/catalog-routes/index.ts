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
  latestData: CatalogVersionData | null;
}

interface PluginContent {
  versions: Map<string, CatalogVersionData>;
  types: Map<string, CatalogTypeData>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseVersion(tag: string): [number, number, boolean, number] {
  const m = tag.replace(/^v/, '').match(/^(\d{4})\.(\d{2})(?:-rc(\d+))?$/);
  if (!m) return [0, 0, false, 0];
  return [+m[1], +m[2], !!m[3], m[3] ? +m[3] : 0];
}

function compareVersionPaths(a: string, b: string): number {
  const [yA, mA, rcA, nA] = parseVersion(a.split('/').pop() ?? '');
  const [yB, mB, rcB, nB] = parseVersion(b.split('/').pop() ?? '');
  if (yA !== yB) return yB - yA;
  if (mA !== mB) return mB - mA;
  if (rcA !== rcB) return rcA ? 1 : -1;
  return nB - nA;
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

      // Read each {id}_{version}-{type}.yaml file from ccc-releases
      const versions = new Map<string, CatalogVersionData>();

      if (fs.existsSync(releasesDir)) {
        for (const filename of fs.readdirSync(releasesDir)) {
          if (!filename.endsWith('.yaml')) continue;
          const match = filename.match(/^(.+)_(.+)-(capabilities|threats|controls)\.yaml$/);
          if (!match) continue;
          const [, metadataId, version, type] = match;

          const loc = idToPath.get(metadataId);
          if (!loc) continue;

          const raw = yaml.load(
            fs.readFileSync(path.join(releasesDir, filename), 'utf8')
          ) as Record<string, any>;

          const rawEntries: any[] = raw?.[type] ?? [];
          const entries: CatalogEntry[] = rawEntries.map((e: any) => ({
            id: String(e.id ?? ''),
            title: String(e.title ?? ''),
            ...(e.description ? { description: String(e.description).replace(/\n+/g, ' ').trim() } : {}),
            ...(e.objective  ? { objective:   String(e.objective).replace(/\n+/g, ' ').trim()   } : {}),
          }));

          const urlPath = `/catalogs/${loc.category}/${loc.service}/${type}/${version}`;
          versions.set(urlPath, {
            title: String(raw?.title ?? ''),
            type: type as CatalogVersionData['type'],
            version,
            category: loc.category,
            service: loc.service,
            entries,
          });
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
          service: parts[2],
          type: parts[3],
          versionPaths: sorted,
          latestData: versions.get(sorted[0]) ?? null,
        });
      }

      return { versions, types };
    },

    async contentLoaded({ content: { versions, types }, actions }) {
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

      // Version routes — inject catalog data as a prop via module
      for (const [urlPath, data] of versions) {
        const dataFile = await createData(
          `catalog-version${urlPath.replace(/\//g, '-')}.json`,
          JSON.stringify(data),
        );
        const parts = urlPath.split('/').filter(Boolean);
        add(`/catalogs/${parts[1]}`);
        add(`/catalogs/${parts[1]}/${parts[2]}`);
        add(urlPath, { catalogVersionData: dataFile });
      }

      // Type routes — inject version list + latest data as a prop via module
      for (const [typePath, data] of types) {
        const dataFile = await createData(
          `catalog-type${typePath.replace(/\//g, '-')}.json`,
          JSON.stringify(data),
        );
        add(typePath, { catalogTypeData: dataFile });
      }

      console.log(`catalog-routes: registered ${added.size} routes`);
    },
  };
}
