import React from "react";
import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import { usePluginData } from "@docusaurus/useGlobalData";
import { prettifySegment, labelFromTitle } from "@site/src/content/catalogUtils";
import "./CatalogSidebar.css";

interface Service {
  slug: string;
  label: string;
  href?: string;
}

interface Category {
  slug: string;
  label: string;
  services: Service[];
}

interface RawStructureEntry {
  slug: string;
  services: Array<{ slug: string; title: string }>;
}

const HREF_OVERRIDES: Record<string, string> = {
  "core/ccc": "/catalogs/core/ccc",
};

function buildCatalogStructure(raw: RawStructureEntry[]): Category[] {
  return raw.map(({ slug, services }) => ({
    slug,
    label: prettifySegment(slug),
    services: services.map(({ slug: svc, title }) => ({
      slug: svc,
      label: labelFromTitle(title),
      href: HREF_OVERRIDES[`${slug}/${svc}`],
    })),
  }));
}

export const CatalogSidebar: React.FC = () => {
  const { pathname } = useLocation();
  const pluginData = usePluginData("catalog-routes") as { catalogStructure?: RawStructureEntry[] } | undefined;
  const catalogStructure = buildCatalogStructure(pluginData?.catalogStructure ?? []);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <nav className="catalog-sidebar">
      <div className="catalog-sidebar-type-title">Catalogs</div>
      {catalogStructure.map(({ slug, label, services }) => {
        if (services.length === 0) return null;

        const categoryActive = services.some(({ slug: svc, href }) => {
          const path = href ?? `/catalogs/${slug}/${svc}`;
          return isActive(path);
        });

        return (
          <details key={slug} open={categoryActive}>
            <summary className={categoryActive ? "category-active" : ""}>
              <span>{label}</span>
              <span className="chevron">▾</span>
            </summary>
            <div className="service-links">
              {services.map(({ slug: svcSlug, label: svcLabel, href }) => {
                const path = href ?? `/catalogs/${slug}/${svcSlug}`;
                return (
                  <Link
                    key={svcSlug}
                    to={path}
                    className={`sidebar-service-link${isActive(path) ? " active" : ""}`}
                  >
                    {svcLabel}
                  </Link>
                );
              })}
            </div>
          </details>
        );
      })}
    </nav>
  );
};
