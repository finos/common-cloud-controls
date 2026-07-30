import React from "react";
import styles from "../Catalogs/CatalogSidebar.module.css";

export interface TOCItem {
  value: string;
  id: string;
  level: number;
}

interface PageSidebarProps {
  toc: readonly TOCItem[];
  title?: string;
}

export default function PageSidebar({ toc, title }: PageSidebarProps) {
  const minLevel = toc.length ? Math.min(...toc.map((i) => i.level)) : 2;
  const topLevel = toc.filter((i) => i.level === minLevel);

  return (
    <nav className={styles.sidebar}>
      {title && (
        <a href="#page-title" className={styles.titleLink}>
          {title}
        </a>
      )}
      {topLevel.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={styles.sectionLink}
          dangerouslySetInnerHTML={{ __html: item.value }}
        />
      ))}
    </nav>
  );
}
