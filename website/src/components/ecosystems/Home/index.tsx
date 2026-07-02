import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import EcosystemLogo from "../EcosystemLogo";
import { ecosystems } from "../ecosystems";
import styles from "./styles.module.css";

export default function EcosystemHomePage() {
  return (
    <Layout title="Ecosystem">
      <div className={styles.grid}>
        {ecosystems.map((ecosystem) => (
          <Link to={`/ecosystems/${ecosystem.slug}`} key={ecosystem.slug} className={styles.card}>
            <div className={styles.logoWrapper}>
              <EcosystemLogo slug={ecosystem.slug} />
            </div>
            <div className={styles.body}>
                <span className={styles.label}>{ecosystem.title}</span>
            </div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
