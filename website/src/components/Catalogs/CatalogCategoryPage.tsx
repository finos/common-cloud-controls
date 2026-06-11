import React from "react";
import Link from "@docusaurus/Link";
import { CatalogSidebar } from "./CatalogSidebar";
import { getSectionItems } from "@site/src/content/sections";
import { useItemBody } from "@site/src/content/useItemBody";
import { useManifest } from "@site/src/content/useManifest";
import { getItemType, getServiceGroups, getServicePath, CATALOG_TYPES, compareVersionPaths, prettifySegment } from "@site/src/content/catalogUtils";
import ReactMarkdown from "react-markdown";
import { markdownComponents } from "./markdownComponents";
import remarkGfm from "remark-gfm";

const TYPE_LABELS: Record<string, string> = {
  capabilities: "Capabilities",
  threats: "Threats",
  controls: "Controls",
};

interface CatalogCategoryPageProps {
  category: string;
  service?: string;
}

export const CatalogCategoryPage: React.FC<CatalogCategoryPageProps> = ({ category, service }) => {
  const manifestReady = useManifest();
  const allItems = manifestReady ? getSectionItems("catalogs") : [];

  // Optional index content: an item whose path is exactly /catalogs/<category>
  const indexItem = allItems.find((item) => item.path === `/catalogs/${category}`);
  const indexBody = useItemBody(indexItem);

  // All services in this category
  const serviceGroups = getServiceGroups(allItems);
  const services = serviceGroups.get(category) ?? [];

  // For core: check which types have published content at /catalogs/core/ccc/<type>
  const isCore = category === "core";
  const coreAvailableTypes = new Set<string>();
  if (isCore) {
    for (const item of allItems) {
      if (!item.path) continue;
      if (getServicePath(item.path) !== "/catalogs/core/ccc") continue;
      const t = getItemType(item.path);
      if (t) coreAvailableTypes.add(t);
    }
  }

  // Which types are available per service
  function availableTypes(service: string): Set<string> {
    const sp = `/catalogs/${category}/${service}`;
    const found = new Set<string>();
    for (const item of allItems) {
      if (!item.path) continue;
      if (getServicePath(item.path) !== sp) continue;
      const t = getItemType(item.path);
      if (t) found.add(t);
    }
    return found;
  }

  const typeOrder = Array.from(CATALOG_TYPES);

  // For service-level pages: find the latest version path for a given type
  function latestVersionPath(svc: string, type: string): string | null {
    const sp = `/catalogs/${category}/${svc}`;
    const paths = allItems
      .filter((item) => item.path && getServicePath(item.path) === sp && getItemType(item.path) === type)
      .map((item) => item.path!)
      .sort(compareVersionPaths);
    return paths[0] ?? null;
  }

  // Service-level view: show type buttons for a single service
  if (service) {
    const available = availableTypes(service);
    return (
      <div className="page-layout">
        <CatalogSidebar />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 0.25rem", color: "var(--ifm-color-emphasis-600)", fontSize: "0.9rem" }}>
            {prettifySegment(category)}
          </p>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--gf-color-accent)", lineHeight: 1.2, marginTop: 0 }}>
            {prettifySegment(service)}
          </h1>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {typeOrder.map((type) => {
              const href = latestVersionPath(service, type);
              return href ? (
                <Link key={type} to={href} className="catalog-type-btn">
                  {TYPE_LABELS[type]}
                </Link>
              ) : (
                <span key={type} className="catalog-type-btn--disabled">
                  {TYPE_LABELS[type]}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-layout">
      <CatalogSidebar />

      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "2rem", lineHeight: 1.2 }}>
          {isCore ? "CCC Core Catalog" : prettifySegment(category)}
        </h1>

        {isCore && (
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem" }}>
            {typeOrder.map((type) => {
              const enabled = coreAvailableTypes.has(type);
              const href = `/catalogs/core/ccc/${type}`;
              return enabled ? (
                <Link key={type} to={href} className="catalog-type-btn">
                  {TYPE_LABELS[type]}
                </Link>
              ) : (
                <span key={type} className="catalog-type-btn--disabled">
                  {TYPE_LABELS[type]}
                </span>
              );
            })}
          </div>
        )}

        {indexBody.trim() && (
          <div className="library-article-body" style={{ color: "var(--gf-color-text)", lineHeight: 1.8, fontSize: "1.05rem", marginBottom: "var(--gf-space-xl)" }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {indexBody}
            </ReactMarkdown>
          </div>
        )}

        {!isCore && services.map(({ label, path: servicePath }) => {
          const serviceSlug = servicePath.split("/").pop()!;
          const available = availableTypes(serviceSlug);
          return (
            <div key={servicePath} style={{ marginBottom: "var(--gf-space-xl)" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem", lineHeight: 1.3 }}>
                {label}
              </h2>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {typeOrder.map((type) => {
                  const enabled = available.has(type);
                  const href = `${servicePath}/${type}`;
                  return enabled ? (
                    <Link key={type} to={href} className="catalog-type-btn">
                      {TYPE_LABELS[type]}
                    </Link>
                  ) : (
                    <span key={type} className="catalog-type-btn--disabled">
                      {TYPE_LABELS[type]}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}

        {isCore && (
          <div className="surface-card">
            <div style={{ margin:"1rem 1rem"}}>
                <h2 style={{ margin: "0 0 1rem", fontSize: "1.25rem", color: "#0086bf" }}>Contribute to the Next Release</h2>
                <p style={{ margin: "0 0 2rem", color: "#0086bf", fontSize: "1rem", lineHeight: 1.6 }}>
                The core catalog is maintained as versioned YAML files. Generated artifacts are published here as each release is cut.
                </p>
                <a
                href="https://github.com/common-cloud-controls/core-catalog"
                target="_blank"
                rel="noopener noreferrer"
                className="catalog-type-btn"
                >
                View on GitHub →
                 </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
