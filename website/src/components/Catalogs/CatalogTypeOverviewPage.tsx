import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "./markdownComponents";
import { CatalogSidebar } from "./CatalogSidebar";

export interface CatalogTypeIndexEntry {
  category: string;
  service: string;
  typePath: string;
}

export interface CatalogTypeIndexData {
  type: string;
  serviceEntries: CatalogTypeIndexEntry[];
}

interface Props {
  data: CatalogTypeIndexData;
}

const TYPE_CONFIG: Record<string, { title: string; label: string }> = {
  capabilities: { title: "Capabilities", label: "What can each service do?" },
  threats:      { title: "Threats",       label: "What might go wrong when we use this service?" },
  controls:     { title: "Controls",      label: "How can we prevent negative outcomes?" },
};

export const CatalogTypeOverviewPage: React.FC<Props> = ({ data }) => {
  const { type } = data;
  const [body, setBody] = useState("");

  useEffect(() => {
    fetch(`/content/${type}.md`)
      .then((r) => (r.ok && r.headers.get("content-type")?.includes("text/plain") ? r.text() : ""))
      .then((md) => setBody(md.replace(/^---[\s\S]*?---\n?/, "")));
  }, [type]);

  const config = TYPE_CONFIG[type] ?? { title: type, label: "" };

  return (
    <div className="page-layout">
      <CatalogSidebar typeIndexData={data} />

      <article style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: "2rem" }}>
          {config.label && (
            <p style={{ margin: "0 0 0.35rem", color: "#0086bf", fontSize: "1rem", lineHeight: 1.5 }}>
              {config.label}
            </p>
          )}
          <h1 className="page-h1" style={{ margin: 0 }}>{config.title}</h1>
        </div>

        {body.trim() && (
          <div
            className="library-article-body"
            style={{ color: "var(--gf-color-text)", lineHeight: 1.8, fontSize: "1.05rem" }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {body}
            </ReactMarkdown>
          </div>
        )}

        <div className="surface-card">
          <div style={{ margin: "1rem 1rem" }}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.25rem", color: "#0086bf" }}>
              Contribute to the Next Release
            </h2>
            <p style={{ margin: "0 0 2rem", color: "#0086bf", fontSize: "1rem", lineHeight: 1.6 }}>
              {config.title} are maintained as versioned YAML files. Generated artifacts are published here as each release is cut.
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
      </article>
    </div>
  );
};
