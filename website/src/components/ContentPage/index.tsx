import React from "react";
import PageSidebar, { TOCItem } from "../PageSidebar";
import styles from "./index.module.css";

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
        <article className={styles.article}>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          <h1 id="page-title" className={`${styles.pageTitle}${subtitle ? ` ${styles.pageTitleWithSubtitle}` : ""}`}>{title}</h1>
          <div className={`library-article-body ${styles.body}`}>
            {children}
          </div>
        </article>
      </div>
    </main>
  );
}
