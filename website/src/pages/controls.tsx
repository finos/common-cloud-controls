import type { ReactNode } from "react";
import Layout from "@theme/Layout";
import { CatalogTypeOverviewPage } from "../components/Catalogs/CatalogTypeOverviewPage";

export default function Controls(): ReactNode {
  return (
    <Layout title="Controls" description="How can we prevent negative outcomes?">
      <main>
        <CatalogTypeOverviewPage type="controls" />
      </main>
    </Layout>
  );
}
