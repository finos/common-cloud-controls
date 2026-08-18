import React from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import { HomePageData } from "@site/src/types/cfi";
import { formatGeneratedAt } from "@site/src/utils/formatGeneratedAt";
import styles from "../cfi.module.css";

export default function CFIHomeTemplate({ pageData }: { pageData: HomePageData }) {
  const { repositories } = pageData;

  return (
    <Layout title="Compliant Financial Infrastructure" description="CFI behavioural compliance test results">
      <main className="container margin-vert--lg">
        <div className={styles.cfiMainLg}>
          <div className={styles.pageHeader}>
            <h1>Compliant Financial Infrastructure</h1>
            <p className={styles.pageSubtitle}>
              Implementation of Common Cloud Controls in Infrastructure as Code
            </p>
          </div>

          <div>
            <h2 className={styles.sectionHeading}>CFI result sources</h2>
            <p className={styles.sectionSubtitle}>
              Test results are grouped by the GitHub repository that publishes CI artifacts
            </p>

            <div className={styles.sectionBodyLg}>
              <div className="library-article-body">
                <table className={styles.tableNavy}>
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Repository</th>
                      <th>Configurations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repositories.map((repository) => (
                      <tr key={repository.destination}>
                        <td className={styles.cellMedium}>
                          <Link to={repository.href} className={styles.link}>
                            {repository.description}
                          </Link>
                        </td>
                        <td>
                          <a href={repository.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                            {repository.url.replace(/^https?:\/\/github\.com\//, "")}
                          </a>
                        </td>
                        <td>{repository.configurationCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {repositories.length === 0 && (
                <div className={styles.emptyState}>
                  No CFI repositories configured. Check <code>cfi-repositories.json</code> and downloaded test results.
                </div>
              )}
            </div>
          </div>

          <p className={styles.footer}>
            Page generated <time dateTime={pageData.generatedAt}>{formatGeneratedAt(pageData.generatedAt)}</time>
          </p>
        </div>
      </main>
    </Layout>
  );
}
