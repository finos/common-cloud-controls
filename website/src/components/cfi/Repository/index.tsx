import React from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import { CFIRepositoryPageData } from "@site/src/types/cfi";
import { configurationSidebarLabel } from "@site/src/utils/cfiNavigation";
import { formatGeneratedAt } from "@site/src/utils/formatGeneratedAt";
import styles from "../cfi.module.css";

export default function CFIRepositoryTemplate({ pageData }: { pageData: CFIRepositoryPageData }): React.ReactElement {
  const { repository, configurations, configurationResultSummariesByPath } = pageData;

  const sortedConfigurations = [...configurations].sort((a, b) => {
    if (a.cfi_details.provider !== b.cfi_details.provider) {
      return a.cfi_details.provider.localeCompare(b.cfi_details.provider);
    }
    return configurationSidebarLabel(a).localeCompare(configurationSidebarLabel(b));
  });

  return (
    <Layout title={repository.description} description={`CFI test results from ${repository.url}`}>
      <main className="container margin-vert--lg">
        <div className={styles.cfiMainLg}>
          <div className={styles.pageHeader}>
            <h1>{repository.description}</h1>
            <p className={styles.pageDescription}>
              Behavioural compliance results downloaded from{" "}
              <a href={repository.url} target="_blank" rel="noopener noreferrer">
                {repository.url.replace(/^https?:\/\/github\.com\//, "")}
              </a>
            </p>
          </div>

          <div>
            <h2 className={styles.sectionHeading}>Configurations</h2>
            <p className={styles.sectionSubtitle}>
              {sortedConfigurations.length} configuration{sortedConfigurations.length === 1 ? "" : "s"} in this results set
            </p>
            <div className={styles.sectionBody}>
              {sortedConfigurations.length > 0 ? (
                <div className="library-article-body">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Provider</th>
                        <th>Name</th>
                        <th>Branch</th>
                        <th>Result sets</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedConfigurations.map((configuration) => {
                        const configPagePath = `/cfi/${configuration.results_relative_path}`;
                        const summaries = configurationResultSummariesByPath[configuration.results_relative_path] ?? [];

                        return (
                          <tr key={configuration.results_relative_path}>
                            <td>
                              <Link to={configPagePath} className={styles.link}>
                                {configuration.cfi_details.id}
                              </Link>
                            </td>
                            <td>
                              <span className={`${styles.pill} ${styles.pillBlue} ${styles.pillUppercase}`}>
                                {configuration.cfi_details.provider}
                              </span>
                            </td>
                            <td>{configuration.cfi_details.name}</td>
                            <td>{configuration.source_details?.branch ?? "—"}</td>
                            <td>{summaries.length}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyState}>No configurations found for this repository.</div>
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
