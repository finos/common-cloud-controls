import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { userJourneyItems } from "../journeys";
import styles from "./styles.module.css";

export default function UserJourneyHomePage() {
  return (
    <Layout title="User Journey" description="FINOS CCC use cases, user journeys, and case studies">
      <div className={styles.grid}>
        {userJourneyItems.map((item) => (
          <Link to={item.to} key={item.slug} className={styles.card}>
            <div className={styles.logoWrapper}>
              <img src={item.logo} alt={item.title} className={styles.logo} />
            </div>
            <div className={styles.body}>
              <span className={styles.label}>{item.title}</span>
            </div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
