import React, { useState } from "react";
import Link from "@docusaurus/Link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CatalogSidebar } from "./CatalogSidebar";
import { markdownComponents } from "./markdownComponents";
import { useManifest } from "@site/src/content/useManifest";
import { getSectionItems } from "@site/src/content/sections";
import { useItemBody } from "@site/src/content/useItemBody";
import { getItemType, getServicePath, compareVersionPaths, prettifySegment } from "@site/src/content/catalogUtils";

interface Props {
  category: string;
  service: string;
  type: string;
}

const TYPE_LABELS: Record<string, string> = {
  capabilities: "Capabilities",
  threats: "Threats",
  controls: "Controls",
};

export const CatalogTypePage: React.FC<Props> = ({ category, service, type }) => {
  const manifestReady = useManifest();
  const allItems = manifestReady ? getSectionItems("catalogs") : [];

  const servicePath = `/catalogs/${category}/${service}`;
  const versionPaths = allItems
    .filter((item) => item.path && getServicePath(item.path) === servicePath && getItemType(item.path) === type)
    .map((item) => item.path!)
    .sort(compareVersionPaths);

  const latestPath = versionPaths[0] ?? null;
  const olderPaths = versionPaths.slice(1);

  const latestItem = latestPath ? allItems.find((i) => i.path === latestPath) : undefined;
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const activePath = selectedPath ?? latestPath;
  const activeItem = activePath ? allItems.find((i) => i.path === activePath) : undefined;
  const body = useItemBody(activeItem);

  const typeLabel = TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div className="page-layout">
      <CatalogSidebar />
      <article style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 0.25rem", color: "var(--ifm-color-emphasis-600)", fontSize: "0.9rem" }}>
          {prettifySegment(category)} / {prettifySegment(service)}
        </p>
        <h1 style={{ marginTop: 0, marginBottom: "1rem" }}>{typeLabel}</h1>

        {!manifestReady && <p>Loading…</p>}

        {manifestReady && versionPaths.length === 0 && (
          <p>No published versions yet.</p>
        )}

        {manifestReady && versionPaths.length > 0 && (
          <>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--ifm-color-emphasis-600)", marginRight: "0.25rem" }}>Version:</span>
              {versionPaths.map((vPath, i) => {
                const version = vPath.split("/").pop()!;
                const isActive = vPath === activePath;
                return (
                  <button
                    key={vPath}
                    onClick={() => setSelectedPath(vPath)}
                    style={{
                      padding: "0.3rem 0.85rem",
                      border: `1px solid ${isActive ? "var(--gf-color-accent, #0086bf)" : "rgba(0,134,191,0.3)"}`,
                      borderRadius: "6px",
                      background: isActive ? "var(--gf-color-accent, #0086bf)" : "transparent",
                      color: isActive ? "#fff" : "var(--gf-color-accent, #0086bf)",
                      fontWeight: isActive ? 600 : 400,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    {version}{i === 0 ? " (latest)" : ""}
                  </button>
                );
              })}
            </div>

            {body.trim() ? (
              <div className="library-article-body" style={{ lineHeight: 1.8, fontSize: "1.05rem" }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {body.trimStart().replace(/^#[^\n]*\n?/, "")}
                </ReactMarkdown>
              </div>
            ) : (
              <p style={{ color: "var(--ifm-color-emphasis-600)" }}>Loading content…</p>
            )}
          </>
        )}
      </article>
    </div>
  );
};
