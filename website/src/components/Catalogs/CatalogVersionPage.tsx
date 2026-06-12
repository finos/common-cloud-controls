import React from "react";
import { CatalogSidebar } from "./CatalogSidebar";
import { prettifySegment } from "@site/src/content/catalogUtils";

export interface CatalogEntry {
  id: string;
  title: string;
  description?: string;
  objective?: string;
}

export interface CatalogVersionData {
  title: string;
  type: "capabilities" | "threats" | "controls";
  version: string;
  category: string;
  service: string;
  entries: CatalogEntry[];
}

interface Props {
  data: CatalogVersionData;
}

export const CatalogVersionPage: React.FC<Props> = ({ data }) => (
  <div className="page-layout">
    <CatalogSidebar />
    <article style={{ flex: 1, minWidth: 0 }}>
      <p style={{ margin: "0 0 0.25rem", color: "var(--ifm-color-emphasis-600)", fontSize: "0.9rem" }}>
        {prettifySegment(data.category)} / {prettifySegment(data.service)}
      </p>
      <h1 style={{ marginTop: 0 }}>{data.title}</h1>
      <p style={{ fontSize: "0.85rem", color: "var(--ifm-color-emphasis-600)", marginBottom: "1.5rem" }}>
        Version: {data.version}
      </p>
      <CatalogTable data={data} />
    </article>
  </div>
);

export const CatalogTable: React.FC<{ data: CatalogVersionData }> = ({ data }) => {
  const valueHeader = data.type === "controls" ? "Objective" : "Description";
  return (
    <div className="library-article-body">
      <table>
        <thead>
          <tr><th>ID</th><th>Title</th><th>{valueHeader}</th></tr>
        </thead>
        <tbody>
          {data.entries.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.id}</td>
              <td>{entry.title}</td>
              <td>{data.type === "controls" ? entry.objective : entry.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
