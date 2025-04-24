import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import styles from "./styles.module.css";

interface ReleasePageData {
  slug: string;
  metadata: {
    name: string;
    description: string;
    url: string;
    authors: Array<{
      name: string;
      github_id: string;
      company: string;
    }>;
  };
  ccc_reference: {
    version: string;
    id: string;
  };
  terraform: {
    source: string;
    script: string;
  };
  test_results: string[];
}

export default function CFIRelease(): React.ReactElement {
  const { siteConfig } = useDocusaurusContext();
  const data = siteConfig.customFields.pageData as ReleasePageData;

  return (
    <Layout title={`CFI - ${data.metadata.name}`} description={data.metadata.description}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1>{data.metadata.name}</h1>
          <p>{data.metadata.description}</p>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <h2>CCC Reference</h2>
            <p>
              This implementation references{" "}
              <Link to={`/ccc/${data.ccc_reference.id}`}>
                {data.ccc_reference.id} (v{data.ccc_reference.version})
              </Link>
            </p>
          </div>

          <div className={styles.section}>
            <h2>Source Code</h2>
            <p>
              <a href={data.metadata.url} target="_blank" rel="noopener noreferrer">
                {data.metadata.url}
              </a>
            </p>
          </div>

          <div className={styles.section}>
            <h2>Authors</h2>
            <ul>
              {data.metadata.authors.map((author) => (
                <li key={author.github_id}>
                  {author.name} ({author.company})
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.section}>
            <h2>Terraform Configuration</h2>
            <div className={styles.terraform}>
              <h3>Source</h3>
              <pre>{data.terraform.source}</pre>
              <h3>Example Usage</h3>
              <pre>{data.terraform.script}</pre>
            </div>
          </div>

          <div className={styles.section}>
            <h2>Test Results</h2>
            <ul>
              {data.test_results.map((result) => (
                <li key={result}>
                  <Link to={`/cfi/${data.slug}/results/${result}`}>{result}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </Layout>
  );
}
