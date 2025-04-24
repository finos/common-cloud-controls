import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import styles from "./styles.module.css";

interface TestResultPageData {
  slug: string;
  result_name: string;
  result_path: string;
  releaseTitle: string;
  ccc_reference: {
    version: string;
    id: string;
  };
}

export default function CFITestResult(): React.ReactElement {
  const { siteConfig } = useDocusaurusContext();
  const data = siteConfig.customFields.pageData as TestResultPageData;

  return (
    <Layout title={`Test Result - ${data.result_name}`} description={`Test results for ${data.releaseTitle}`}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1>Test Results: {data.result_name}</h1>
          <p>
            For <Link to={`/cfi/${data.slug}`}>{data.releaseTitle}</Link>
          </p>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <h2>CCC Reference</h2>
            <p>
              <Link to={`/ccc/${data.ccc_reference.id}`}>
                {data.ccc_reference.id} (v{data.ccc_reference.version})
              </Link>
            </p>
          </div>

          <div className={styles.section}>
            <h2>Test Results</h2>
            <div className={styles.testResults}>
              {/* TODO: Add actual test results display */}
              <p>Test results will be displayed here.</p>
              <p>Path: {data.result_path}</p>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
