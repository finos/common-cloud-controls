import React from "react";
import Link from "@docusaurus/Link";
import { CatalogSidebar } from "./CatalogSidebar";
import { prettifySegment } from "@site/src/content/catalogUtils";
import type { CatalogEntry, CatalogGuidelineMapping } from "./CatalogVersionPage";
import styles from "./CatalogEntryPage.module.css";

export interface CatalogRelatedEntry {
  id: string;
  title: string;
  description?: string;
  url: string;
}

export interface CatalogEntryDetailData {
  category: string;
  service: string;
  version: string;
  type: "capabilities" | "threats" | "controls";
  entry: CatalogEntry;
  relatedCapabilities?: CatalogRelatedEntry[];
  relatedThreats?: CatalogRelatedEntry[];
  relatedControls?: CatalogRelatedEntry[];
}

interface Props {
  data: CatalogEntryDetailData;
}

const TYPE_LABELS: Record<string, string> = {
  capabilities: "Capabilities",
  threats: "Threats",
  controls: "Controls",
};

const RelatedList: React.FC<{ title: string; items?: CatalogRelatedEntry[] }> = ({ title, items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className="library-article-body">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.url !== "#" ? <Link to={item.url}>{item.id}</Link> : item.id}</td>
                <td>{item.title}</td>
                <td>{item.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MappingTable: React.FC<{ title: string; items?: CatalogGuidelineMapping[] }> = ({ title, items }) => {
  if (!items || items.length === 0) return null;
  // Mappings sourced from Gemara MappingDocuments carry a relationship; inline
  // guideline mappings don't, so only show the column when there is data for it.
  const hasRelationship = items.some((m) => m.relationship);
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className="library-article-body">
        <table>
          <thead>
            <tr>
              <th>Framework</th>
              <th>ID</th>
              {hasRelationship && <th>Relationship</th>}
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m, i) => (
              <tr key={`${m.framework}-${m.id}-${i}`}>
                <td>{m.framework}</td>
                <td>
                  {m.url ? (
                    <a href={m.url} target="_blank" rel="noopener noreferrer">
                      {m.id}
                    </a>
                  ) : (
                    m.id
                  )}
                </td>
                {hasRelationship && <td>{m.relationship}</td>}
                <td>{m.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const CatalogEntryPage: React.FC<Props> = ({ data }) => {
  const { category, service, version, type, entry } = data;
  const typePath = `/catalogs/${category}/${service}/${type}/${version}`;

  return (
    <div className="page-layout">
      <CatalogSidebar />
      <article className={styles.main}>
        <p className={styles.breadcrumb}>
          {prettifySegment(category)}
          {" / "}
          <Link to={`/catalogs/${category}/${service}`}>
            {prettifySegment(service)}
          </Link>
          {" / "}
          <Link to={typePath}>{TYPE_LABELS[type] ?? type}</Link>
          {` / ${version}`}
        </p>
        <h1 className={styles.pageTitle}>{entry.title}</h1>
        <p className={styles.entryId}>
          {entry.id}
          {entry.family ? ` · ${entry.family}` : ""}
        </p>

        {(entry.description || entry.objective) && (
          <div className={`library-article-body ${styles.section}`}>
            <p>{type === "controls" ? entry.objective : entry.description}</p>
          </div>
        )}

        <RelatedList title="Related Capabilities" items={data.relatedCapabilities} />
        <RelatedList title="Related Threats" items={data.relatedThreats} />
        <RelatedList title="Related Controls" items={data.relatedControls} />

        {entry.assessmentRequirements && entry.assessmentRequirements.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Assessment Requirements</h3>
            <div className="library-article-body">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Text</th>
                    <th>Applicability</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.assessmentRequirements.map((ar) => (
                    <tr key={ar.id} id={ar.id}>
                      <td>{ar.id}</td>
                      <td>{ar.text}</td>
                      <td>{ar.applicability?.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <MappingTable title="Guideline Mappings" items={entry.guidelineMappings} />
        <MappingTable title="External Mappings" items={entry.externalMappings} />
      </article>
    </div>
  );
};
