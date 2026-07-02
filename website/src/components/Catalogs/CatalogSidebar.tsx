import React from "react";
import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import { usePluginData } from "@docusaurus/useGlobalData";
import { prettifySegment, labelFromTitle } from "@site/src/content/catalogUtils";
import type { CatalogTypeIndexData } from "./CatalogTypeOverviewPage";
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
  "core/ccc": "/catalogs/core",
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

const TYPE_TITLE: Record<string, string> = {
  capabilities: "Capabilities",
  threats: "Threats",
  controls: "Controls",
};

interface CatalogSidebarProps {
  typeIndexData?: CatalogTypeIndexData;
}

export const CatalogSidebar: React.FC<CatalogSidebarProps> = ({ typeIndexData }) => {
  const { pathname } = useLocation();
  const pluginData = usePluginData("catalog-routes") as { catalogStructure?: RawStructureEntry[] } | undefined;
  const catalogStructure = buildCatalogStructure(pluginData?.catalogStructure ?? []);

  const typeLinkMap = typeIndexData
    ? new Map(typeIndexData.serviceEntries.map((e) => [`${e.category}/${e.service}`, e.typePath]))
    : null;

  const title = typeIndexData
    ? (TYPE_TITLE[typeIndexData.type] ?? typeIndexData.type.charAt(0).toUpperCase() + typeIndexData.type.slice(1))
    : null;

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <nav className="catalog-sidebar">
      {title && <div className="catalog-sidebar-type-title">{title}</div>}
      {catalogStructure.map(({ slug, label, services }) => {
        const visibleServices = typeLinkMap
          ? services.filter((svc) => typeLinkMap.has(`${slug}/${svc.slug}`))
          : services;

        if (visibleServices.length === 0) return null;

        const categoryActive = visibleServices.some(({ slug: svc, href }) => {
          const path = typeLinkMap?.get(`${slug}/${svc}`) ?? href ?? `/catalogs/${slug}/${svc}`;
          return isActive(path);
        });

        return (
          <details key={slug} open={categoryActive}>
            <summary className={categoryActive ? "category-active" : ""}>
              <span>{label}</span>
              <span className="chevron">▾</span>
            </summary>
            <div className="service-links">
              {visibleServices.map(({ slug: svcSlug, label: svcLabel, href }) => {
                const path =
                  typeLinkMap?.get(`${slug}/${svcSlug}`) ??
                  href ??
                  `/catalogs/${slug}/${svcSlug}`;
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
