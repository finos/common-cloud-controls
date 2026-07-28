import React, { useState } from "react";
import { CatalogSidebar } from "./CatalogSidebar";
import { prettifySegment } from "@site/src/content/catalogUtils";
import { CatalogTable } from "./CatalogVersionPage";
import type { CatalogVersionData } from "./CatalogVersionPage";
import styles from "./CatalogTypePage.module.css";
import catalogStyles from "./catalog.module.css";
import clsx from "clsx";

export interface CatalogTypeData {
  category: string;
  service: string;
  type: string;
  versionPaths: string[];
  allVersionData: CatalogVersionData[];
}

interface Props {
  data: CatalogTypeData;
}

const TYPE_LABELS: Record<string, string> = {
  capabilities: "Capabilities",
  threats: "Threats",
  controls: "Controls",
};

export const CatalogTypePage: React.FC<Props> = ({ data }) => {
  const { category, service, type } = data;
  const versionPaths: string[] = data.versionPaths ?? [];
  const allVersionData: CatalogVersionData[] = data.allVersionData ?? [];
  const [selectedIdx, setSelectedIdx] = useState(0);
  const typeLabel = TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
  const activeData = allVersionData[selectedIdx];

  const yamlName = `${data.category}/${data.service}/${data.type}.yaml`;
  const yamlLink = `https://raw.githubusercontent.com/finos/common-cloud-controls/refs/heads/main/catalogs/${yamlName}`;

  async function downloadFromGithub(rawUrl: string, filename?: string) {
    const resp = await fetch(rawUrl, { headers: { Accept: "application/octet-stream" } });
    if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? (rawUrl.split("/").pop() ?? "file");
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-layout">
      <CatalogSidebar />
      <article className={styles.main}>
        <p className={styles.breadcrumb}>
          {prettifySegment(category)} / {prettifySegment(service)}
        </p>
        <h1 className={styles.pageTitle}>{typeLabel}</h1>

        {allVersionData.length === 0 && <p>No published versions yet.</p>}

        {allVersionData.length > 0 && (
          <>
            <div className={styles.versionPicker}>
              <span className={styles.versionLabel}>Version:</span>
              {versionPaths.map((vPath, i) => (
                <button
                  key={vPath}
                  onClick={() => setSelectedIdx(i)}
                  className={clsx(catalogStyles.typeBtn, i !== selectedIdx && catalogStyles.typeBtnInactive)}
                >
                  {vPath.split("/").pop()}{i === 0 ? " (latest)" : ""}
                </button>
              ))}
              <button
                className={catalogStyles.typeBtn}
                style={{ marginLeft: "auto", fontSize: "0.85rem" }}
                onClick={() => downloadFromGithub(yamlLink, yamlName)}
              >
                Download file from GitHub
              </button>
            </div>
            {activeData && <CatalogTable data={activeData} />}
          </>
        )}
      </article>
    </div>
  );
};
