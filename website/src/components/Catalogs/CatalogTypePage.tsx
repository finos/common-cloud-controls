import React, { useState } from "react";
import { CatalogSidebar } from "./CatalogSidebar";
import { prettifySegment } from "@site/src/content/catalogUtils";
import { CatalogTable } from "./CatalogVersionPage";
import type { CatalogVersionData } from "./CatalogVersionPage";
import type { CatalogTypeIndexData } from "./CatalogTypeOverviewPage";

export interface CatalogTypeData {
  category: string;
  service: string;
  type: string;
  versionPaths: string[];
  allVersionData: CatalogVersionData[];
}

interface Props {
  data: CatalogTypeData;
  typeIndexData?: CatalogTypeIndexData;
}

const TYPE_LABELS: Record<string, string> = {
  capabilities: "Capabilities",
  threats: "Threats",
  controls: "Controls",
};

const btnReset: React.CSSProperties = {
  font: "inherit",
  cursor: "pointer",
  border: "none",
  padding:".5rem 0.75rem",
  background: "transparent",
};

export const CatalogTypePage: React.FC<Props> = ({ data, typeIndexData }) => {
  const { category, service, type } = data;
  const versionPaths: string[] = data.versionPaths ?? [];
  const allVersionData: CatalogVersionData[] = data.allVersionData ?? [];
  const [selectedIdx, setSelectedIdx] = useState(0);
  const typeLabel = TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
  const activeData = allVersionData[selectedIdx];

  return (
    <div className="page-layout">
      <CatalogSidebar typeIndexData={typeIndexData} />
      <article style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 0.25rem", color: "var(--ifm-color-emphasis-600)", fontSize: "0.9rem" }}>
          {prettifySegment(category)} / {prettifySegment(service)}
        </p>
        <h1 style={{ marginTop: 0, marginBottom: "1rem" }}>{typeLabel}</h1>

        {allVersionData.length === 0 && <p>No published versions yet.</p>}

        {allVersionData.length > 0 && (
          <>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--ifm-color-emphasis-600)", marginRight: "0.25rem" }}>
                Version:
              </span>
              {versionPaths.map((vPath, i) => (
                <button
                  key={vPath}
                  onClick={() => setSelectedIdx(i)}
                  className="catalog-type-btn"
                  style={{ ...btnReset, color: "#0086bf", opacity: i === selectedIdx ? 1 : 0.55 }}
                >
                  {vPath.split("/").pop()}{i === 0 ? " (latest)" : ""}
                </button>
              ))}
            </div>
            {activeData && <CatalogTable data={activeData} />}
          </>
        )}
      </article>
    </div>
  );
};
