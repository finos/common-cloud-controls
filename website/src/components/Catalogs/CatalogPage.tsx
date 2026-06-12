import React from "react";
import Layout from "@theme/Layout";
import { useLocation } from "@docusaurus/router";
import { CatalogCategoryPage } from "./CatalogCategoryPage";
import { CatalogTypePage } from "./CatalogTypePage";
import { CatalogVersionPage } from "./CatalogVersionPage";
import type { CatalogTypeData } from "./CatalogTypePage";
import type { CatalogVersionData } from "./CatalogVersionPage";
import { prettifySegment } from "@site/src/content/catalogUtils";

interface Props {
  catalogVersionData?: CatalogVersionData;
  catalogTypeData?: CatalogTypeData;
}

export default function CatalogPage({ catalogVersionData, catalogTypeData }: Props): React.ReactElement {
  const { pathname } = useLocation();
  const parts = pathname.replace(/\/$/, "").split("/").filter(Boolean);

  let title = "Catalog";
  let content: React.ReactNode = null;

  if (catalogVersionData) {
    title = `${prettifySegment(parts[2] ?? "")} ${parts[3] ?? ""}`;
    content = <CatalogVersionPage data={catalogVersionData} />;
  } else if (catalogTypeData) {
    title = `${prettifySegment(parts[2] ?? "")} – ${parts[3] ?? ""}`;
    content = <CatalogTypePage data={catalogTypeData} />;
  } else if (parts.length === 2) {
    title = `${prettifySegment(parts[1])} Catalog`;
    content = <CatalogCategoryPage category={parts[1]} />;
  } else if (parts.length === 3) {
    title = prettifySegment(parts[2]);
    content = <CatalogCategoryPage category={parts[1]} service={parts[2]} />;
  }

  return (
    <Layout title={title}>
      <main>{content}</main>
    </Layout>
  );
}
