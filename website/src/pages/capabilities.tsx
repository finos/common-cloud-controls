import type { ReactNode } from "react";
import Layout from "@theme/Layout";
import { CatalogTypeOverviewPage } from "./catalogTypeOverview";

export default function Capabilities(): ReactNode {
  return (
    <Layout title="Capabilities" description="What can each service can do?">
      <main>
        <CatalogTypeOverviewPage type="capabilities" />
      </main>
    </Layout>
  );
}
