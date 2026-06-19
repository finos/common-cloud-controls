import type { ReactNode } from "react";
import Layout from "@theme/Layout";
import { CatalogSidebar } from "../components/Catalogs/CatalogSidebar";
import styles from "../components/AdvanceAutomatedGovernence/styles.module.css"

export default function Catalogs(): ReactNode {
  return (
    <Layout title="Catalogs" description="Browse the Common Cloud Controls catalogs">
      <div className="page-layout">
        <CatalogSidebar />
        <div>
          <div className={styles.catalogsLayout}>
            <div className={styles.catalogsText}>
              <div>
            <h3 className={styles.catalogsTitle}>Three Catalogs, One Complete Picture</h3>
          </div>
              <p className={styles.prose}>
                Each cloud service is covered by three interlocking catalog types — Capabilities, Threats, and Controls — because real-world governance requires all three layers to be explicit and independently reusable.
              </p>
              <p className={styles.prose}>
                Keeping them separate means your team can import only what is relevant, compose new service catalogs from existing building blocks, and map controls directly to the threats they mitigate — without carrying the weight of definitions you don't need.
              </p>
            </div>
            <div className={styles.catalogsImageWrapper}>
              <img
                src="/img/diagrams/catalogs-diagram.svg"
                alt="CCC catalog structure diagram"
                className={styles.catalogsImage}
              />
            </div>
          </div>
          </div>
        </div>
    </Layout>
  );
}
