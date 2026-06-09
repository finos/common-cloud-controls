import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "../components/Catalogs/markdownComponents";
import { getSectionItemByPath } from "../content/sections";
import { useItemBody } from "../content/useItemBody";
import { useManifest } from "../content/useManifest";
import { CatalogSidebar } from "../components/Catalogs/CatalogSidebar";

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
        {/* Type header */}
        <div style={{ marginBottom: "var(--gf-space-xl)" }}>
          <p style={{ margin: "0 0 0.35rem", color: "var(--gf-color-text-subtle)", fontSize: "1rem", lineHeight: 1.5 }}>
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

        {/* Contribute */}
        <div className="surface-card" style={{
          marginTop: "var(--gf-space-xl)",
          padding: "var(--gf-space-lg)",
        }}>
          <h2 style={{ margin: "0 0 var(--gf-space-sm)", fontSize: "1.25rem" }}>Contribute to the Next Release</h2>
          <p style={{ margin: "0 0 var(--gf-space-md)", color: "var(--gf-color-text-subtle)", fontSize: "1rem", lineHeight: 1.6 }}>
            {item?.title} are maintained as versioned YAML files. Generated artifacts are published here as each release is cut.
          </p>
          <a
            href={`https://github.com/common-cloud-controls/${config.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "0.6rem 1.5rem",
              background: "var(--gf-color-accent)",
              color: "var(--gf-color-button-text, #fff)",
              borderRadius: "var(--gf-radius-lg)",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.95rem",
              whiteSpace: "nowrap",
            }}
          >
            View on GitHub →
          </a>
        </div>
      </article>
    </div>
  );
};
