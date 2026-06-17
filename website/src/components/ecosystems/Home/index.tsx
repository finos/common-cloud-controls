import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import styles from "./styles.module.css";

const pages = [
  'prowler',
  'privateer', 
  'azure-policy',
  'azure-verified-modules',
  'aws-lightning-lane', 
  'gemara', 
  'grc-store', 
  'github-releases',
  'calmsuite'
];
export default function EcosystemHomePage() {

  return (
    <Layout title="Ecosystem">
      <div className={styles.grid}>
        {pages.map((m) => (
          <Link to={"/ecosystems/"+m} key={m} className={styles.card}>
            <div className={styles.logoWrapper}>
              
            </div>
            <div className={styles.body}>
              <div className={styles.row}>
                <span className={styles.label}>{m}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
