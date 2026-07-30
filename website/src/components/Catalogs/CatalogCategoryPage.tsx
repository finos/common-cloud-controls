import React, { useState, useEffect } from "react";
import Link from "@docusaurus/Link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CatalogSidebar } from "./CatalogSidebar";
import { markdownComponents } from "./markdownComponents";
import { prettifySegment, labelFromTitle } from "@site/src/content/catalogUtils";
import { User } from "../shared/User";
import styles from "./CatalogCategoryPage.module.css";
import catalogStyles from "./catalog.module.css";
import { ContributeCard } from "./ContributeCard";

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
  title?: string;
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
  return prettifySegment(category);
}

function getServiceLabel(_category: string, service: string, title?: string): string {
  return title ? labelFromTitle(title) : prettifySegment(service);
}

function TypeButtons({ svcInfo }: { svcInfo: CatalogServiceInfo }) {
  return (
    <div className={styles.typeButtonsRow}>
      {TYPE_ORDER.map((type) => {
        const entry = svcInfo.types.find((t) => t.type === type);
        return entry ? (
          <Link key={type} to={entry.typePath} className={catalogStyles.typeBtn}>
            {TYPE_LABELS[type]}
          </Link>
        ) : (
          <span key={type} className={catalogStyles.typeBtnDisabled}>
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
    <div className={`library-article-body ${styles.releasesTable}`}>
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
                  <div className={styles.contributorsList}>
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

  if (service) {
    const svcInfo = services.find((s) => s.slug === service);
    return (
      <div className="page-layout">
        <CatalogSidebar />
        <article className={styles.main}>
          <p className={styles.categoryLabel}>{getCategoryLabel(category)}</p>
          <h1 className={styles.pageTitle}>{getServiceLabel(category, service, svcInfo?.title)}</h1>
          {svcInfo ? (
            <>
              <TypeButtons svcInfo={svcInfo} />
              {svcInfo.description && (
                <p style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "var(--gf-color-text)", marginTop: "1.5rem", marginBottom: "1.5rem" }}>
                  {svcInfo.description}
                </p>
              )}
              {svcInfo.exampleCspServices && svcInfo.exampleCspServices.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--gf-color-accent-strong)", textAlign: "left" }}>
                    Cloud Provider Equivalents
                  </h2>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "flex-start" }}>
                    {svcInfo.exampleCspServices.map((csp) => (
                      <a
                        key={csp.provider}
                        href={csp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          padding: "0.75rem 1rem",
                          border: "1px solid rgba(0,134,191,0.25)",
                          borderRadius: "8px",
                          background: "var(--gf-color-surface)",
                          textDecoration: "none",
                          minWidth: "160px",
                        }}
                      >
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gf-color-text-subtle)", marginBottom: "0.25rem" }}>
                          {csp.provider}
                        </span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--gf-color-accent)" }}>
                          {csp.service}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--gf-color-text-subtle)", marginTop: "0.25rem" }}>
                          View docs →
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <ReleasesTable releases={svcInfo.releases} />
              {svcInfo.mappingReferences && svcInfo.mappingReferences.length > 0 && (
                <div style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--gf-color-accent-strong)", textAlign: "left" }}>
                    Mapping References
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {svcInfo.mappingReferences.map((ref) => (
                      <div
                        key={ref.id}
                        style={{
                          padding: "0.75rem 1rem",
                          border: "1px solid rgba(0,134,191,0.25)",
                          borderRadius: "8px",
                          background: "var(--gf-color-surface)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: ref.description ? "0.4rem" : 0 }}>
                          {ref.url ? (
                            <a href={ref.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--gf-color-accent)" }}>
                              {ref.title}
                            </a>
                          ) : (
                            <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--gf-color-accent)" }}>{ref.title}</span>
                          )}
                          {ref.version && (
                            <span style={{ fontSize: "0.75rem", color: "var(--gf-color-text-subtle)" }}>{ref.version}</span>
                          )}
                        </div>
                        {ref.description && (
                          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--gf-color-text)", lineHeight: 1.6 }}>
                            {ref.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <ContributeCard body="This catalog is maintained as versioned YAML files. Generated artifacts are published here as each release is cut." />
            </>
          ) : (
            <p className={styles.emptyNote}>No published catalogs yet.</p>
          )}
        </article>
      </div>
    );
  }

  const isSingleService = services.length === 1;
  const isCore = isSingleService && services[0]?.slug === "core";

  return (
    <div className="page-layout">
      <CatalogSidebar />
      <div className={styles.main}>
        <h1 className={styles.categoryTitle}>
          {isCore ? "CCC Core Catalog" : getCategoryLabel(category)}
        </h1>

        {isSingleService && (
          <div className={styles.typeBtnWrapper}>
            <TypeButtons svcInfo={services[0]} />
          </div>
        )}

        {descBody.trim() && (
          <div className={`library-article-body ${styles.descBody}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {descBody}
            </ReactMarkdown>
          </div>
        )}

        {!isSingleService &&
          services.map((svc) => (
            <div key={svc.slug} className={styles.serviceBlock}>
              <h2 className={styles.serviceTitle}>
                {getServiceLabel(category, svc.slug, svc.title)}
              </h2>
              <TypeButtons svcInfo={svc} />
            </div>
          ))}

        {isCore && (
          <ContributeCard body="The core catalog is maintained as versioned YAML files. Generated artifacts are published here as each release is cut." />
        )}
      </div>
    </div>
  );
};
