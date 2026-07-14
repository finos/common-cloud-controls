import React from "react";
import PageSidebar, { TOCItem } from "../PageSidebar";

interface ContentPageProps {
  subtitle?: string;
  title: string;
  toc?: readonly TOCItem[];
  children: React.ReactNode;
}

export default function ContentPage({ subtitle, title, toc, children }: ContentPageProps) {
  return (
    <main>
      <div className="page-layout">
        {toc && toc.length > 0 && <PageSidebar toc={toc} title={title} />}
        <article className="content-page-article" style={{ flex: 1, minWidth: 0 }}>
          {subtitle && (
            <p
              style={{
                margin: "0 0 0.35rem",
                color: "var(--gf-color-text-subtle)",
                fontSize: "1rem",
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              {subtitle}
            </p>
          )}
          <h1
            id="page-title"
            className="page-h1"
            style={{ margin: 0 }}
          >
            {title}
          </h1>
          <div
            className="library-article-body"
            style={{
              color: "var(--gf-color-text)",
              lineHeight: 1.8,
              fontSize: "1.05rem",
              marginTop: "1.5rem",
            }}
          >
            {children}
          </div>
        </article>
      </div>
    </main>
  );
}
