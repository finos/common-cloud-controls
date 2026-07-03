import React from "react";
import Link from "@docusaurus/Link";
import { CatalogSidebar } from "./CatalogSidebar";
import { useManifest } from "@site/src/content/useManifest";
import { getSectionItems } from "@site/src/content/sections";
import { getItemType, getServicePath, CATALOG_TYPES, compareVersionPaths, prettifySegment } from "@site/src/content/catalogUtils";

interface Props {
  category: string;
  service: string;
}

const TYPE_LABELS: Record<string, string> = {
  capabilities: "Capabilities",
  threats: "Threats",
  controls: "Controls",
};

export const CatalogServicePage: React.FC<Props> = ({ category, service }) => {
  const manifestReady = useManifest();
  const allItems = manifestReady ? getSectionItems("catalogs") : [];

  const servicePath = `/catalogs/${category}/${service}`;
  const serviceItems = allItems.filter(
    (item) => item.path && getServicePath(item.path) === servicePath
  );

  const byType = new Map<string, string[]>();
  for (const item of serviceItems) {
    if (!item.path) continue;
    const type = getItemType(item.path);
    if (!type) continue;
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)!.push(item.path);
  }
  for (const paths of byType.values()) {
    paths.sort(compareVersionPaths);
  }

  return (
    <div className="page-layout">
      <CatalogSidebar />
      <article style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 0.25rem", color: "var(--ifm-color-emphasis-600)", fontSize: "0.9rem" }}>
          {prettifySegment(category)}
        </p>
        <h1 style={{ marginTop: 0 }}>{prettifySegment(service)}</h1>

        {!manifestReady && <p>Loading catalog…</p>}

        {manifestReady && byType.size === 0 && (
          <p>No catalog content published yet for this service.</p>
        )}

        {manifestReady && byType.size > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {(Array.from(CATALOG_TYPES) as string[])
              .filter((t) => byType.has(t))
              .map((type) => {
                const paths = byType.get(type)!;
                return (
                  <div key={type}>
                    <h2 style={{ marginTop: 0 }}>{TYPE_LABELS[type]}</h2>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {paths.map((vPath, i) => {
                        const version = vPath.split("/").pop()!;
                        return (
                          <Link
                            key={vPath}
                            to={vPath}
                            style={{
                              padding: "0.4rem 1rem",
                              border: "1px solid rgba(0,134,191,0.3)",
                              borderRadius: "6px",
                              background: i === 0 ? "#effbff" : "transparent",
                              color: "#0086bf",
                              fontWeight: i === 0 ? 600 : 400,
                              fontSize: "0.9rem",
                              textDecoration: "none",
                            }}
                          >
                            {version}{i === 0 ? " (latest)" : ""}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </article>
    </div>
  );
};
