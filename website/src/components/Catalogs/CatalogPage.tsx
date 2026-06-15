import React from "react";
import Layout from "@theme/Layout";
import { useLocation } from "@docusaurus/router";
import { CatalogCategoryPage } from "./CatalogCategoryPage";
import { CatalogTypePage } from "./CatalogTypePage";
import { CatalogVersionPage } from "./CatalogVersionPage";
import { CatalogTypeOverviewPage } from "./CatalogTypeOverviewPage";
import type { CatalogTypeData } from "./CatalogTypePage";
import type { CatalogVersionData } from "./CatalogVersionPage";
import type { CatalogCategoryData } from "./CatalogCategoryPage";
import type { CatalogTypeIndexData } from "./CatalogTypeOverviewPage";
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
  catalogTypeIndexData?: CatalogTypeIndexData;
}

export default function CatalogPage({ catalogVersionData, catalogTypeData, catalogCategoryData, catalogTypeIndexData }: Props): React.ReactElement {
  const { pathname } = useLocation();
  const parts = pathname.replace(/\/$/, "").split("/").filter(Boolean);

  let title = "Catalog";
  let content: React.ReactNode = null;

  if (catalogVersionData) {
    title = `${prettifySegment(catalogVersionData.service)} – ${catalogVersionData.version}`;
    content = <CatalogVersionPage data={catalogVersionData} typeIndexData={catalogTypeIndexData} />;
  } else if (catalogTypeData) {
    title = `${prettifySegment(catalogTypeData.service)} – ${TYPE_LABELS[catalogTypeData.type] ?? catalogTypeData.type}`;
    content = <CatalogTypePage data={catalogTypeData} typeIndexData={catalogTypeIndexData} />;
  } else if (catalogTypeIndexData) {
    title = TYPE_LABELS[catalogTypeIndexData.type] ?? prettifySegment(catalogTypeIndexData.type);
    content = <CatalogTypeOverviewPage data={catalogTypeIndexData} />;
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
