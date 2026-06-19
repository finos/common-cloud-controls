import React from "react";
import Link from "@docusaurus/Link";
import { CatalogSidebar } from "./CatalogSidebar";
import { prettifySegment } from "@site/src/content/catalogUtils";
import type { CatalogTypeIndexData } from "./CatalogTypeOverviewPage";
import type { CatalogEntry } from "./CatalogVersionPage";

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
  typeIndexData?: CatalogTypeIndexData;
}

const TYPE_LABELS: Record<string, string> = {
  capabilities: "Capabilities",
  threats: "Threats",
  controls: "Controls",
};

const RelatedList: React.FC<{ title: string; items?: CatalogRelatedEntry[] }> = ({ title, items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>{title}</h3>
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

export const CatalogEntryPage: React.FC<Props> = ({ data, typeIndexData }) => {
  const { category, service, version, type, entry } = data;
  const typePath = `/catalogs/${category}/${service}/${type}/${version}`;

  return (
    <div className="page-layout">
      <CatalogSidebar typeIndexData={typeIndexData} />
      <article style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 0.25rem", color: "var(--ifm-color-emphasis-600)", fontSize: "0.9rem" }}>
          <Link to={`/catalogs/${category}/${service}`}>
            {prettifySegment(category)} / {prettifySegment(service)}
          </Link>
          {" / "}
          <Link to={typePath}>{TYPE_LABELS[type] ?? type}</Link>
          {` / ${version}`}
        </p>
        <h1 style={{ marginTop: 0 }}>{entry.title}</h1>
        <p style={{ fontSize: "0.85rem", color: "var(--ifm-color-emphasis-600)", marginBottom: "1.5rem" }}>
          {entry.id}
          {entry.family ? ` · ${entry.family}` : ""}
        </p>

        {(entry.description || entry.objective) && (
          <div className="library-article-body" style={{ marginBottom: "1.5rem" }}>
            <p>{type === "controls" ? entry.objective : entry.description}</p>
          </div>
        )}

        <RelatedList title="Related Capabilities" items={data.relatedCapabilities} />
        <RelatedList title="Related Threats" items={data.relatedThreats} />
        <RelatedList title="Related Controls" items={data.relatedControls} />

        {entry.assessmentRequirements && entry.assessmentRequirements.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Assessment Requirements</h3>
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
                    <tr key={ar.id}>
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
      </article>
    </div>
  );
};
