import React, { useState, useEffect } from "react";
import Link from "@docusaurus/Link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CatalogSidebar, CATALOG_STRUCTURE } from "./CatalogSidebar";
import { markdownComponents } from "./markdownComponents";
import { prettifySegment } from "@site/src/content/catalogUtils";
import { User } from "../shared/User";

export interface CatalogContributor {
  name: string;
  "github-id"?: string;
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

export interface CatalogServiceInfo {
  slug: string;
  types: Array<{ type: string; typePath: string }>;
  releases: CatalogReleaseSummary[];
}

export interface CatalogCategoryData {
  category: string;
  services: CatalogServiceInfo[];
}

interface Props {
  data: CatalogCategoryData;
  service?: string;
}

const TYPE_ORDER = ["capabilities", "threats", "controls"];
const TYPE_LABELS: Record<string, string> = {
  capabilities: "Capabilities",
  threats: "Threats",
  controls: "Controls",
};

function getCategoryLabel(category: string): string {
  return CATALOG_STRUCTURE.find((c) => c.slug === category)?.label ?? prettifySegment(category);
}

function getServiceLabel(category: string, service: string): string {
  const cat = CATALOG_STRUCTURE.find((c) => c.slug === category);
  return cat?.services.find((s) => s.slug === service)?.label ?? prettifySegment(service);
}

function TypeButtons({ svcInfo }: { svcInfo: CatalogServiceInfo }) {
  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      {TYPE_ORDER.map((type) => {
        const entry = svcInfo.types.find((t) => t.type === type);
        return entry ? (
          <Link key={type} to={entry.typePath} className="catalog-type-btn">
            {TYPE_LABELS[type]}
          </Link>
        ) : (
          <span key={type} className="catalog-type-btn--disabled">
            {TYPE_LABELS[type]}
          </span>
        );
      })}
    </div>
  );
}

function ReleasesTable({ releases }: { releases: CatalogReleaseSummary[] }) {
  if (!releases.length) return null;
  return (
    <div className="library-article-body" style={{ marginTop: "1.5rem" }}>
      <table>
        <thead>
          <tr>
            <th>Version</th>
            <th>Release Manager</th>
            <th>Authors</th>
            <th>Controls</th>
            <th>Threats</th>
            <th>Capabilities</th>
          </tr>
        </thead>
        <tbody>
          {releases.map((release) => (
            <tr key={release.version}>
              <td>{release.version}</td>
              <td>{release.releaseManager?.name ? <User contributor={release.releaseManager} /> : "Development Team"}</td>
              <td>
                {release.contributors?.length ? (
                  <div className="flex flex-col gap-2">
                    {release.contributors.map((c, i) => (
                      <User key={i} contributor={c} />
                    ))}
                  </div>
                ) : (
                  "Development Team"
                )}
              </td>
              <td>{release.typePaths.controls ? <Link to={release.typePaths.controls}>{release.controlsCount}</Link> : release.controlsCount}</td>
              <td>{release.typePaths.threats ? <Link to={release.typePaths.threats}>{release.threatsCount}</Link> : release.threatsCount}</td>
              <td>{release.typePaths.capabilities ? <Link to={release.typePaths.capabilities}>{release.capabilitiesCount}</Link> : release.capabilitiesCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const CatalogCategoryPage: React.FC<Props> = ({ data, service }) => {
  const [descBody, setDescBody] = useState("");
  const { category, services } = data;

  useEffect(() => {
    fetch(`/content/${category}.md`)
      .then((r) => (r.ok ? r.text() : ""))
      .then((md) => setDescBody(md.replace(/^---[\s\S]*?---\n?/, "")));
  }, [category]);

  // Service-level view: single service, show its type buttons
  if (service) {
    const svcInfo = services.find((s) => s.slug === service);
    return (
      <div className="page-layout">
        <CatalogSidebar />
        <article style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 0.25rem", color: "var(--ifm-color-emphasis-600)", fontSize: "0.9rem" }}>
            {getCategoryLabel(category)}
          </p>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "1.5rem", marginTop: 0, color: "var(--gf-color-accent)", lineHeight: 1.2 }}>
            {getServiceLabel(category, service)}
          </h1>
          {svcInfo ? (
            <>
              <TypeButtons svcInfo={svcInfo} />
              <ReleasesTable releases={svcInfo.releases} />
            </>
          ) : (
            <p style={{ color: "var(--ifm-color-emphasis-600)" }}>No published catalogs yet.</p>
          )}
        </article>
      </div>
    );
  }

  // Category-level view
  const isSingleService = services.length === 1;
  const isCore = isSingleService && services[0]?.slug === "ccc";

  return (
    <div className="page-layout">
      <CatalogSidebar />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "1.5rem", lineHeight: 1.2, marginTop: 0 }}>
          {isCore ? "CCC Core Catalog" : getCategoryLabel(category)}
        </h1>

        {/* For single-service categories (core), show type buttons directly */}
        {isSingleService && (
          <div style={{ marginBottom: "2rem" }}>
            <TypeButtons svcInfo={services[0]} />
          </div>
        )}

        {/* Description body fetched from static content */}
        {descBody.trim() && (
          <div
            className="library-article-body"
            style={{ color: "var(--gf-color-text)", lineHeight: 1.8, fontSize: "1.05rem", marginBottom: "var(--gf-space-xl)" }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {descBody}
            </ReactMarkdown>
          </div>
        )}

        {/* For multi-service categories, list each service with its type buttons */}
        {!isSingleService &&
          services.map((svc) => (
            <div key={svc.slug} style={{ marginBottom: "var(--gf-space-xl)" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", lineHeight: 1.3 }}>
                {getServiceLabel(category, svc.slug)}
              </h2>
              <TypeButtons svcInfo={svc} />
            </div>
          ))}

        {/* Contribute card for core */}
        {isCore && (
          <div className="surface-card">
            <div style={{ margin: "1rem 1rem" }}>
              <h2 style={{ margin: "0 0 1rem", fontSize: "1.25rem", color: "#0086bf" }}>
                Contribute to the Next Release
              </h2>
              <p style={{ margin: "0 0 2rem", color: "#0086bf", fontSize: "1rem", lineHeight: 1.6 }}>
                The core catalog is maintained as versioned YAML files. Generated artifacts are published here as each release is cut.
              </p>
              <a
                href="https://github.com/finos/common-cloud-controls"
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
