import type { ReactNode } from "react";
import Layout from "@theme/Layout";
import { CatalogTypeOverviewPage } from "./catalogTypeOverview";

export default function Threats(): ReactNode {
  return (
    <Layout title="Threats" description="What might go wrong when we use this service?">
      <main>
        <CatalogTypeOverviewPage type="threats" />
      </main>
    </Layout>
  );
}
