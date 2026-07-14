import React from "react";
import Layout from "@theme/Layout";
import { useLocation } from "@docusaurus/router";
import { CatalogCategoryPage } from "./CatalogCategoryPage";
import { CatalogTypePage } from "./CatalogTypePage";
import { CatalogVersionPage } from "./CatalogVersionPage";
import { CatalogEntryPage } from "./CatalogEntryPage";
import type { CatalogTypeData } from "./CatalogTypePage";
import type { CatalogVersionData } from "./CatalogVersionPage";
import type { CatalogCategoryData } from "./CatalogCategoryPage";
import type { CatalogEntryDetailData } from "./CatalogEntryPage";
import { prettifySegment } from "@site/src/content/catalogUtils";

const TYPE_LABELS: Record<string, string> = {
  capabilities: "Capabilities",
  threats: "Threats",
  controls: "Controls",
};

interface Props {
  catalogVersionData?: CatalogVersionData;
  catalogTypeData?: CatalogTypeData;
  catalogCategoryData?: CatalogCategoryData;
  catalogEntryData?: CatalogEntryDetailData;
}

export default function CatalogPage({ catalogVersionData, catalogTypeData, catalogCategoryData, catalogEntryData }: Props): React.ReactElement {
  const { pathname } = useLocation();
  const parts = pathname.replace(/\/$/, "").split("/").filter(Boolean);

  let title = "Catalog";
  let content: React.ReactNode = null;

  if (catalogEntryData) {
    title = `${catalogEntryData.entry.title} – ${prettifySegment(catalogEntryData.service)}`;
    content = <CatalogEntryPage data={catalogEntryData} />;
  } else if (catalogVersionData) {
    title = `${prettifySegment(catalogVersionData.service)} – ${catalogVersionData.version}`;
    content = <CatalogVersionPage data={catalogVersionData} />;
  } else if (catalogTypeData) {
    title = `${prettifySegment(catalogTypeData.service)} – ${TYPE_LABELS[catalogTypeData.type] ?? catalogTypeData.type}`;
    content = <CatalogTypePage data={catalogTypeData} />;
  } else if (catalogCategoryData) {
    const service = parts.length >= 3 ? parts[2] : undefined;
    title = service ? prettifySegment(service) : prettifySegment(catalogCategoryData.category);
    content = <CatalogCategoryPage data={catalogCategoryData} service={service} />;
  }

  return (
    <Layout title={title}>
      <main>{content}</main>
    </Layout>
  );
}
