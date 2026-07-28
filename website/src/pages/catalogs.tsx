import { useState, useEffect, type ReactNode } from "react";
import Layout from "@theme/Layout";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CatalogSidebar } from "../components/Catalogs/CatalogSidebar";
import { markdownComponents } from "../components/Catalogs/markdownComponents";
import { ContributeCard } from "../components/Catalogs/ContributeCard";
import styles from "../components/AdvanceAutomatedGovernence/styles.module.css";

const TYPE_CONFIG = [
  {
    type: "capabilities",
    title: "Capabilities",
    label: "What can each service do?",
  },
  {
    type: "threats",
    title: "Threats",
    label: "What might go wrong when we use this service?",
  },
  {
    type: "controls",
    title: "Controls",
    label: "How can we prevent negative outcomes?",
  },
];

function CatalogTypeSection({ type, title, label }: { type: string; title: string; label: string }) {
  const [body, setBody] = useState("");

  useEffect(() => {
    fetch(`/content/${type}.md`)
      .then((r) => (r.ok ? r.text() : ""))
      .then((md) => setBody(md.replace(/^---[\s\S]*?---\n?/, "")));
  }, [type]);

  return (
    <div style={{ marginTop: "3rem" }}>
      {label && (
        <p style={{ margin: "0 0 0.35rem", color: "var(--gf-color-accent)", fontSize: "1rem", lineHeight: 1.5, textAlign: "center" }}>
          {label}
        </p>
      )}
      <h2 style={{ margin: "0 0 1.5rem", color: "var(--gf-color-accent-strong)", lineHeight: 1.2, textAlign: "center" }}>
        {title}
      </h2>

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
    </div>
  );
}

export default function Catalogs(): ReactNode {
  return (
    <Layout title="Catalogs" description="Browse the Common Cloud Controls catalogs">
      <div className="page-layout">
        <CatalogSidebar />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={styles.catalogsLayout}>
            <div className={styles.catalogsText}>
              <div>
                <h1 className={styles.catalogsTitle}>Three Catalogs, One Complete Picture</h1>
              </div>
              <p className={styles.prose}>
                Each cloud service is covered by three interlocking catalog types — Capabilities, Threats, and Controls — because real-world governance requires all three layers to be explicit and independently reusable.
              </p>
              <p className={styles.prose}>
                Keeping them separate means your team can import only what is relevant, compose new service catalogs from existing building blocks, and map controls directly to the threats they mitigate — without carrying the weight of definitions you don't need.
              </p>
            </div>
            <div className={styles.catalogsImageWrapper}>
              <img
                src="/img/diagrams/catalogs-diagram.svg"
                alt="CCC catalog structure diagram"
                className={styles.catalogsImage}
              />
            </div>
          </div>

          {TYPE_CONFIG.map((cfg) => (
            <CatalogTypeSection key={cfg.type} {...cfg} />
          ))}

          <ContributeCard />
        </div>
      </div>
    </Layout>
  );
}
