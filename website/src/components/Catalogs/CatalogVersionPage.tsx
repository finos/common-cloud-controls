import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CatalogSidebar } from "./CatalogSidebar";
import { markdownComponents } from "./markdownComponents";
import { useManifest } from "@site/src/content/useManifest";
import { getSectionItemByPath } from "@site/src/content/sections";
import { useItemBody } from "@site/src/content/useItemBody";
import { prettifySegment } from "@site/src/content/catalogUtils";

interface Props {
  catalogPath: string;
}

export const CatalogVersionPage: React.FC<Props> = ({ catalogPath }) => {
  const manifestReady = useManifest();
  const item = manifestReady ? getSectionItemByPath("catalogs", catalogPath) : undefined;
  const body = useItemBody(item);

  const parts = catalogPath.split("/").filter(Boolean);
  // parts: ['catalogs', category, service, type, version]
  const service = parts[2] ? prettifySegment(parts[2]) : "";
  const type = parts[3] ? parts[3].charAt(0).toUpperCase() + parts[3].slice(1) : "";
  const version = parts[4] ?? "";

  // Strip leading H1 from the body — the component renders the title itself
  const bodyWithoutTitle = body.trimStart().replace(/^#[^\n]*\n?/, "");

  return (
    <div className="page-layout">
      <CatalogSidebar />
      <article style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 0.25rem", color: "var(--ifm-color-emphasis-600)", fontSize: "0.9rem" }}>
          {service} / {type}
        </p>
        <h1 style={{ marginTop: 0 }}>{item?.title ?? `${service} ${type}`}</h1>
        <p style={{ fontSize: "0.85rem", color: "var(--ifm-color-emphasis-600)", marginBottom: "1.5rem" }}>
          Version: {version}
        </p>

        {!manifestReady && <p>Loading…</p>}

        {manifestReady && bodyWithoutTitle.trim() ? (
          <div className="library-article-body" style={{ lineHeight: 1.8, fontSize: "1.05rem" }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {bodyWithoutTitle}
            </ReactMarkdown>
          </div>
        ) : manifestReady ? (
          <p>Content not available for this version.</p>
        ) : null}
      </article>
    </div>
  );
};
