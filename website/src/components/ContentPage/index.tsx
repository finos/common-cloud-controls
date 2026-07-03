import React from "react";

interface ContentPageProps {
  subtitle?: string;
  title: string;
  children: React.ReactNode;
}

export default function ContentPage({ subtitle, title, children }: ContentPageProps) {
  return (
    <main>
      <div className="page-layout">
        <article style={{ flex: 1, minWidth: 0 }}>
          {subtitle && (
            <p
              style={{
                margin: "0 0 0.35rem",
                color: "var(--gf-color-text-subtle)",
                fontSize: "1rem",
                lineHeight: 1.5,
              }}
            >
              {subtitle}
            </p>
          )}
          <h1
            className="page-h1"
            style={{ margin: 0, fontSize: "2rem", fontWeight: 700 }}
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
