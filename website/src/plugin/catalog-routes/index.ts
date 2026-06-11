import fs from 'fs';
import path from 'path';
import type { LoadContext, Plugin } from '@docusaurus/types';

export default function pluginCatalogRoutes(context: LoadContext): Plugin<void> {
  return {
    name: 'catalog-routes',

    async contentLoaded({ actions }) {
      const { addRoute } = actions;
      const manifestPath = path.resolve(context.siteDir, 'static/content-manifest.json');

      if (!fs.existsSync(manifestPath)) {
        console.warn('catalog-routes: content-manifest.json not found, skipping');
        return;
      }

      const fileContent = fs.readFileSync(manifestPath, 'utf8');
      const raw = fileContent.charCodeAt(0) === 0xFEFF ? fileContent.slice(1) : fileContent;
      const manifest: Array<{ path?: string }> = JSON.parse(raw);

      const added = new Set<string>();
      const add = (routePath: string) => {
        if (added.has(routePath)) return;
        added.add(routePath);
        addRoute({
          path: routePath,
          component: '@site/src/components/Catalogs/CatalogPage',
          exact: true,
        });
      };

      const typeOverviews = new Set(['capabilities', 'threats', 'controls']);

      for (const entry of manifest) {
        const p = entry.path;
        if (!p || !p.startsWith('/catalogs/')) continue;

        const parts = p.split('/').filter(Boolean);
        // parts[0] = 'catalogs'

        if (parts.length === 5) {
          // version-level: /catalogs/<cat>/<svc>/<type>/<version>
          // also register category, service, and type routes
          add(`/catalogs/${parts[1]}`);
          add(`/catalogs/${parts[1]}/${parts[2]}`);
          add(`/catalogs/${parts[1]}/${parts[2]}/${parts[3]}`);
          add(p);
        } else if (parts.length === 2) {
          // top-level category: /catalogs/<cat>
          // skip type-overview slugs that already have dedicated pages
          if (!typeOverviews.has(parts[1])) {
            add(p);
          }
        }
      }

      console.log(`catalog-routes: registered ${added.size} routes`);
    },
  };
}
