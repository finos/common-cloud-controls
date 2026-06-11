import React from "react";
import Layout from "@theme/Layout";
import { useLocation } from "@docusaurus/router";
import { CatalogCategoryPage } from "./CatalogCategoryPage";
import { CatalogTypePage } from "./CatalogTypePage";
import { CatalogVersionPage } from "./CatalogVersionPage";
import { prettifySegment } from "@site/src/content/catalogUtils";

export default function CatalogPage(): React.ReactElement {
  const { pathname } = useLocation();
  const parts = pathname.replace(/\/$/, "").split("/").filter(Boolean);
  // parts[0] = 'catalogs', [1] = category, [2] = service, [3] = type, [4] = version

  let title = "Catalog";
  let content: React.ReactNode = null;

  if (parts.length === 2) {
    // /catalogs/<category>
    title = `${prettifySegment(parts[1])} Catalog`;
    content = <CatalogCategoryPage category={parts[1]} />;
  } else if (parts.length === 3) {
    // /catalogs/<category>/<service>
    title = prettifySegment(parts[2]);
    content = <CatalogCategoryPage category={parts[1]} service={parts[2]} />;
  } else if (parts.length === 4) {
    // /catalogs/<category>/<service>/<type>
    title = `${prettifySegment(parts[2])} – ${parts[3]}`;
    content = <CatalogTypePage category={parts[1]} service={parts[2]} type={parts[3]} />;
  } else if (parts.length === 5) {
    // /catalogs/<category>/<service>/<type>/<version>
    title = `${prettifySegment(parts[2])} ${parts[3]}`;
    content = <CatalogVersionPage catalogPath={pathname} />;
  }

  return (
    <Layout title={title}>
      <main>{content}</main>
    </Layout>
  );
}
