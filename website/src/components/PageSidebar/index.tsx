import React from "react";
import "../Catalogs/CatalogSidebar.css";

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
    <nav className="catalog-sidebar">
      {title && (
        <a href="#page-title" className="sidebar-page-title-link">
          {title}
        </a>
      )}
      {topLevel.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="sidebar-page-section-link"
          dangerouslySetInnerHTML={{ __html: item.value }}
        />
      ))}
    </nav>
  );
}
