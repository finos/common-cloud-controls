import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "./markdownComponents";
import { getSectionItemByPath } from "../../content/sections";
import { useItemBody } from "../../content/useItemBody";
import { useManifest } from "../../content/useManifest";
import { CatalogSidebar } from "./CatalogSidebar";

interface CatalogTypeOverviewPageProps {
  type: "capabilities" | "threats" | "controls";
}

const typeConfig: Record<string, { title: string; label: string; repo: string }> = {
  capabilities: { title: "Capabilities", label: "What can each service can do?", repo: "capability-catalogs" },
  threats:      { title: "Threats",       label: "What might go wrong when we use this service?", repo: "threat-catalogs" },
  controls:     { title: "Controls",      label: "How can we prevent negative outcomes?", repo: "control-catalogs" },
};

export const CatalogTypeOverviewPage: React.FC<CatalogTypeOverviewPageProps> = ({ type }) => {
  const manifestReady = useManifest();
  const item = manifestReady ? getSectionItemByPath("catalogs", `/catalogs/${type}`) : undefined;
  const body = useItemBody(item);

  const config = typeConfig[type];
  const title = item?.title ?? config.title;

  return (
    <div className="page-layout">
      <CatalogSidebar typeFilter={type} />

      <article style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: "2rem" }}>
          <p style={{ margin: "0 .5 0.35rem", color: "#0086bf", fontSize: "1rem", lineHeight: 1.5 }}>
            {config.label}
          </p>
          <h1 className="page-h1" style={{ margin: 0 }}>{item?.title}</h1>
        </div>

        {item?.description && (
          <p className="page-description">{item.description}</p>
        )}

        {body.trim() && (
          <div className="library-article-body" style={{ color: "var(--gf-color-text)", lineHeight: 1.8, fontSize: "1.05rem" }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {body}
            </ReactMarkdown>
          </div>
        )}

        <div className="surface-card">
          <div style={{ margin:"1rem 1rem"}}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "1.25rem", color: "#0086bf" }}>Contribute to the Next Release</h2>
          <p style={{ margin: "0 0 2rem", color: "#0086bf", fontSize: "1rem", lineHeight: 1.6 }}>
            {title} are maintained as versioned YAML files. Generated artifacts are published here as each release is cut.
          </p>
          <a
                href="https://github.com/common-cloud-controls/core-catalog"
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
