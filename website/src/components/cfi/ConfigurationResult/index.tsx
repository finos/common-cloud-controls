import React from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import { ConfigurationResultPageData, ControlCatalogSummary, ResourceSummary, TestResultItem, TestSummary, TestMappingSummary, TestMappingDetail, DownloadLink, RequirementLink } from "@site/src/types/cfi";
import { useCatalogAssessmentRequirements, buildAssessmentRequirementIndex } from "@site/src/utils/catalogDataLookup";
import type { CatalogAssessmentRequirementRef } from "@site/src/plugin/catalog-routes";
import styles from "../cfi.module.css";

function extractCatalogId(testRequirement: string): string {
  const parts = testRequirement.split(".");
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : testRequirement;
}

function minus(setA: Set<string>, setB: Set<string>): Set<string> {
  const result = new Set<string>();
  setA.forEach((item) => {
    if (!setB.has(item)) result.add(item);
  });
  return result;
}

function intersect(setA: Set<string>, setB: Set<string>): Set<string> {
  return new Set([...setA].filter((x) => setB.has(x)));
}

function serviceCatalogsFromTests(testedRequirementsByCatalog: Map<string, Set<string>>): string[] {
  return [...testedRequirementsByCatalog.keys()].filter((id) => id !== "CCC.Core");
}

function shouldAddToNecessaryRequirementIds(
  catalogId: string,
  serviceCatalogIds: string[],
  useServiceCatalogScope: boolean,
  testedRequirementsByCatalog: Map<string, Set<string>>
): boolean {
  if (catalogId === "CCC.Core") return false;
  if (useServiceCatalogScope && !serviceCatalogIds.includes(catalogId)) return false;
  if (testedRequirementsByCatalog.has(catalogId)) return true;
  if (catalogId === "CCC.Core" && serviceCatalogIds.includes(catalogId)) return true;
  return false;
}

function convertToLink(reqId: string, requirementIndex: Map<string, CatalogAssessmentRequirementRef>): RequirementLink {
  const found = requirementIndex.get(reqId);
  return { id: reqId, url: found?.url ?? "#", title: found?.text || reqId };
}

function generateCatalogSummary(
  testResults: TestResultItem[],
  allRequirements: CatalogAssessmentRequirementRef[],
  requirementIndex: Map<string, CatalogAssessmentRequirementRef>,
): ControlCatalogSummary[] {
  const testedRequirementsByCatalog = new Map<string, Set<string>>();
  testResults.forEach((result) => {
    result.test_requirements?.forEach((testReq) => {
      const catalogId = extractCatalogId(testReq);
      if (!testedRequirementsByCatalog.has(catalogId)) testedRequirementsByCatalog.set(catalogId, new Set());
      testedRequirementsByCatalog.get(catalogId)!.add(testReq);
    });
  });

  const allRequirementsByCatalog = new Map<string, Set<string>>();
  const allNecessaryRequirementIds = new Set<string>();
  const serviceCatalogIds = serviceCatalogsFromTests(testedRequirementsByCatalog);
  const useServiceCatalogScope = serviceCatalogIds.length > 0;

  allRequirements.forEach((req) => {
    const catalogId = extractCatalogId(req.id);
    if (testedRequirementsByCatalog.has(catalogId)) {
      if (!allRequirementsByCatalog.has(catalogId)) allRequirementsByCatalog.set(catalogId, new Set());
      allRequirementsByCatalog.get(catalogId)!.add(req.id);
    }
    if (shouldAddToNecessaryRequirementIds(catalogId, serviceCatalogIds, useServiceCatalogScope, testedRequirementsByCatalog)) {
      allNecessaryRequirementIds.add(req.id);
    }
  });

  const catalogsInThisResult = Array.from(allRequirementsByCatalog.keys());
  const summaries = catalogsInThisResult.map((catalogId) => {
    const testsInCatalog = testResults.filter((result) =>
      result.test_requirements?.some((testReq) => extractCatalogId(testReq) === catalogId)
    );
    const resourcesInCatalog = testsInCatalog.flatMap((result) => result.resources);
    const testedRequirementIds = testedRequirementsByCatalog.get(catalogId) || new Set<string>();
    const allRequirementIds = allRequirementsByCatalog.get(catalogId) || new Set<string>();
    const necessaryRequirementIds = intersect(allNecessaryRequirementIds, allRequirementIds);
    const unusedRequirementIds = minus(allRequirementIds, necessaryRequirementIds);
    const missingRequirementIds = minus(necessaryRequirementIds, testedRequirementIds);

    const out = {
      catalogId,
      resources: [...new Set(resourcesInCatalog)],
      totalTests: testsInCatalog.length,
      passingTests: testsInCatalog.filter((result) => result.status_code === "PASS").length,
      failingTests: testsInCatalog.filter((result) => result.status_code === "FAIL").length,
      unusedRequirements: Array.from(unusedRequirementIds).map((reqId) => convertToLink(reqId, requirementIndex)),
      testedRequirements: Array.from(testedRequirementIds).map((reqId) => convertToLink(reqId, requirementIndex)),
      missingRequirements: Array.from(missingRequirementIds).map((reqId) => convertToLink(reqId, requirementIndex)),
    };
    return out;
  });

  summaries.forEach((summary) => {
    summary.resources.sort();
    summary.testedRequirements.sort((a, b) => a.id.localeCompare(b.id));
    summary.missingRequirements.sort((a, b) => a.id.localeCompare(b.id));
  });

  return summaries.sort((a, b) => a.catalogId.localeCompare(b.catalogId));
}

function generateResourceSummary(testResults: TestResultItem[]): ResourceSummary[] {
  const resourceMap = new Map<string, ResourceSummary>();

  testResults.forEach((result) => {
    const resourceName = result.resource_name || "Unknown Resource";
    const resourceType = result.resource_type || "Unknown Type";
    const key = `${resourceName}-${resourceType}`;

    if (!resourceMap.has(key)) {
      resourceMap.set(key, { resourceName, resourceType, catalogs: [], totalTests: 0, passingTests: 0, failingTests: 0 });
    }

    const summary = resourceMap.get(key)!;
    summary.totalTests++;

    result.test_requirements?.forEach((testReq) => {
      const catalogId = extractCatalogId(testReq);
      if (!summary.catalogs.includes(catalogId)) summary.catalogs.push(catalogId);
    });

    if (result.status_code === "PASS") summary.passingTests++;
    else if (result.status_code === "FAIL") summary.failingTests++;
  });

  const summaries = Array.from(resourceMap.values());
  summaries.forEach((summary) => summary.catalogs.sort());
  return summaries.sort((a, b) => a.resourceName.localeCompare(b.resourceName));
}

function generateTestSummary(testResults: TestResultItem[]) {
  const uniqueResources = new Set<string>();
  const uniqueCatalogs = new Set<string>();
  let totalTests = 0;
  let passingTests = 0;
  let failingTests = 0;

  testResults.forEach((result) => {
    const resourceKey = `${result.resource_name || "Unknown Resource"}-${result.resource_type || "Unknown Type"}`;
    uniqueResources.add(resourceKey);
    totalTests++;
    if (result.status_code === "PASS") passingTests++;
    else if (result.status_code === "FAIL") failingTests++;
    result.test_requirements?.forEach((testReq) => uniqueCatalogs.add(extractCatalogId(testReq)));
  });

  return {
    resourcesInConfiguration: uniqueResources.size,
    countOfTests: totalTests,
    passingTests,
    failingTests,
    catalogsTested: Array.from(uniqueCatalogs).sort(),
  };
}

function generateTestMappingSummary(testResults: TestResultItem[]): TestMappingSummary[] {
  const eventCodeMap = new Map<string, Map<string, TestMappingDetail>>();

  testResults.forEach((result) => {
    const eventCode = result.test || "Unknown Event Code";
    result.test_requirements?.forEach((testReq) => {
      const catalogId = extractCatalogId(testReq);
      const requirementKey = `${catalogId}-${testReq}`;

      if (!eventCodeMap.has(requirementKey)) eventCodeMap.set(requirementKey, new Map<string, TestMappingDetail>());
      const eventMap = eventCodeMap.get(requirementKey)!;

      if (!eventMap.has(eventCode)) eventMap.set(eventCode, { eventCode, totalTests: 0, passingTests: 0, failingTests: 0 });
      const detail = eventMap.get(eventCode)!;
      detail.totalTests++;
      if (result.status_code === "PASS") detail.passingTests++;
      else if (result.status_code === "FAIL") detail.failingTests++;
    });
  });

  const summaryMap = new Map<string, TestMappingSummary>();
  eventCodeMap.forEach((eventMap, requirementKey) => {
    const dashIndex = requirementKey.indexOf("-");
    const catalogId = requirementKey.substring(0, dashIndex);
    const testReq = requirementKey.substring(dashIndex + 1);

    if (!summaryMap.has(requirementKey)) {
      summaryMap.set(requirementKey, { controlCatalog: catalogId, testRequirementId: testReq, mappedTests: [] });
    }
    summaryMap.get(requirementKey)!.mappedTests = Array.from(eventMap.values()).sort((a, b) => a.eventCode.localeCompare(b.eventCode));
  });

  return Array.from(summaryMap.values()).sort((a, b) => {
    if (a.controlCatalog !== b.controlCatalog) return a.controlCatalog.localeCompare(b.controlCatalog);
    return a.testRequirementId.localeCompare(b.testRequirementId);
  });
}

export default function CFIConfigurationResult({ pageData }: { pageData: ConfigurationResultPageData }): React.ReactElement {
  const { configuration, configurationResult } = pageData;
  const { cfi_details, results_relative_path, source_details } = configuration;
  const repoDestination = results_relative_path.split("/")[0];
  const repoHref = `/cfi/${repoDestination}`;
  const configurationHref = `/cfi/${results_relative_path}`;
  const allRequirements = useCatalogAssessmentRequirements();
  const requirementIndex = buildAssessmentRequirementIndex(allRequirements);

  const testResults = configurationResult.test_results;
  const testResultsWithCCC = testResults.filter((result) => result.test_requirements && result.test_requirements.length > 0);
  const catalogSummary = testResultsWithCCC.length > 0 ? generateCatalogSummary(testResultsWithCCC, allRequirements, requirementIndex) : [];
  const resourceSummary = testResults.length > 0 ? generateResourceSummary(testResults) : [];
  const testSummary = testResultsWithCCC.length > 0 ? generateTestSummary(testResultsWithCCC) : null;
  const testMappingSummary = testResultsWithCCC.length > 0 ? generateTestMappingSummary(testResultsWithCCC) : [];

  const groupedDownloadLinks = (configurationResult.download_links || []).reduce(
    (acc, link) => {
      const baseName = link.name.replace(/\.(ocsf\.json|html|ya?ml)$/i, "");
      if (!acc[baseName]) acc[baseName] = [];
      acc[baseName].push(link);
      return acc;
    },
    {} as Record<string, DownloadLink[]>,
  );

  const downloadClass = (type: string): string => {
    switch (type) {
      case "html": return `${styles.downloadBtn} ${styles.downloadHtml}`;
      case "gemara": return `${styles.downloadBtn} ${styles.downloadGemara}`;
      default: return `${styles.downloadBtn} ${styles.downloadOcsf}`;
    }
  };

  const statusPillClass = (statusCode: string): string =>
    `${styles.pill} ${statusCode === "PASS" ? styles.pillGreen : statusCode === "FAIL" ? styles.pillRed : styles.pillYellow}`;

  return (
    <Layout
      title={`${configurationResult.product} ${configurationResult.version} - ${cfi_details.name}`}
      description={`Test results for ${configurationResult.vendor} ${configurationResult.product} ${configurationResult.version}`}
    >
      <main className="container margin-vert--lg">
        <div className={styles.cfiMain}>
          <nav className={styles.breadcrumbNav}>
            <Link to="/cfi">CFI</Link>
            <span>/</span>
            <Link to={repoHref}>{source_details?.repository_description ?? repoDestination}</Link>
            <span>/</span>
            <Link to={configurationHref}>{cfi_details.id}</Link>
            <span>/</span>
            <span className={styles.breadcrumbCurrent}>
              {configurationResult.product} {configurationResult.version}
            </span>
          </nav>

          <div>
            <h2 className={styles.sectionHeading}>
              {configurationResult.product} {configurationResult.version}
            </h2>
            <p className={styles.sectionSubtitle}>
              Test results for this specific product, vendor, and version combination
            </p>
            <div className={styles.sectionBody}>
              <div className="library-article-body">
                <table>
                  <tbody>
                    <tr>
                      <td className={styles.labelCell}>Vendor</td>
                      <td><span className={`${styles.pill} ${styles.pillPurple}`}>{configurationResult.vendor}</span></td>
                    </tr>
                    <tr>
                      <td className={styles.labelCell}>Product</td>
                      <td><span className={`${styles.pill} ${styles.pillBlue}`}>{configurationResult.product}</span></td>
                    </tr>
                    <tr>
                      <td className={styles.labelCell}>Version</td>
                      <td><span className={`${styles.pill} ${styles.pillGreen}`}>{configurationResult.version}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {configurationResult.download_links && configurationResult.download_links.length > 0 && (
            <div>
              <h2 className={styles.sectionHeading}>Download Raw Results</h2>
              <p className={styles.sectionSubtitle}>
                Download the original OCSF, Gemara, or HTML result files used to generate this page
              </p>
              <div className={styles.sectionBody}>
                <div className="library-article-body">
                  <table>
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>Download</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groupedDownloadLinks).map(([baseName, links], index) => (
                        <tr key={index}>
                          <td className={styles.fontMono}>{baseName}</td>
                          <td>
                            <div className={styles.downloadBtns}>
                              {links.map((link, linkIndex) => (
                                <a key={linkIndex} href={link.url} target="_blank" rel="noopener noreferrer" className={downloadClass(link.type)}>
                                  {link.type === "gemara" ? "GEMARA" : link.type.toUpperCase()}
                                </a>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div>
            <h2 className={styles.sectionHeading}>Test Summary</h2>
            <p className={styles.sectionSubtitle}>
              Aggregate summary of all tests for this configuration result
            </p>
            <div className={styles.sectionBody}>
              {testSummary ? (
                <div className="library-article-body">
                  <table>
                    <tbody>
                      <tr>
                        <td className={styles.labelCell}>Resources In Configuration</td>
                        <td><span className={`${styles.pill} ${styles.pillBlue} ${styles.pillBold}`}>{testSummary.resourcesInConfiguration}</span></td>
                      </tr>
                      <tr>
                        <td className={styles.labelCell}>Count of Tests</td>
                        <td><span className={`${styles.pill} ${styles.pillGray} ${styles.pillBold}`}>{testSummary.countOfTests}</span></td>
                      </tr>
                      <tr>
                        <td className={styles.labelCell}>Passing Tests</td>
                        <td><span className={`${styles.pill} ${styles.pillGreen} ${styles.pillBold}`}>{testSummary.passingTests}</span></td>
                      </tr>
                      <tr>
                        <td className={styles.labelCell}>Failing Tests</td>
                        <td><span className={`${styles.pill} ${styles.pillRed} ${styles.pillBold}`}>{testSummary.failingTests}</span></td>
                      </tr>
                      <tr>
                        <td className={styles.labelCell}>Catalogs Tested</td>
                        <td>
                          <div className={styles.pillGroup}>
                            {testSummary.catalogsTested.length > 0 ? (
                              testSummary.catalogsTested.map((catalog, catalogIndex) => (
                                <span key={catalogIndex} className={`${styles.pill} ${styles.pillBlue}`}>{catalog}</span>
                              ))
                            ) : (
                              <span className={`${styles.pill} ${styles.pillGray}`}>No CCC catalogs</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyState}>No test summary data available.</div>
              )}
            </div>
          </div>

          <div>
            <h2 className={styles.sectionHeading}>Control Catalog Summary</h2>
            <p className={styles.sectionSubtitle}>
              Summary of test results grouped by control catalog and resource
            </p>
            <div className={styles.sectionBody}>
              {catalogSummary && catalogSummary.length > 0 ? (
                <div className="library-article-body">
                  <table>
                    <thead>
                      <tr>
                        <th>Control Catalog</th>
                        <th>Resources</th>
                        <th>Total Tests</th>
                        <th>Passing</th>
                        <th>Failing</th>
                        <th>Tested Requirements</th>
                        <th>Missing Requirements</th>
                        <th>Unused Core Requirements</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalogSummary.map((summary, index) => (
                        <tr key={index}>
                          <td className={styles.cellMedium}>{summary.catalogId}</td>
                          <td>
                            <div className={styles.pillGroup}>
                              {summary.resources.map((resource, resourceIndex) => (
                                <span key={resourceIndex} className={`${styles.pill} ${styles.pillBlue}`} title={resource}>
                                  {resource.length > 20 ? `${resource.substring(0, 20)}...` : resource}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td><span className={`${styles.pill} ${styles.pillGray} ${styles.pillBold}`}>{summary.totalTests}</span></td>
                          <td><span className={`${styles.pill} ${styles.pillGreen} ${styles.pillBold}`}>{summary.passingTests}</span></td>
                          <td><span className={`${styles.pill} ${styles.pillRed} ${styles.pillBold}`}>{summary.failingTests}</span></td>
                          <td>
                            <div className={styles.pillGroup}>
                              {summary.testedRequirements.length > 0 ? (
                                summary.testedRequirements.map((tested, testedIndex) =>
                                  tested.url === "#" ? (
                                    <span key={testedIndex} className={`${styles.pill} ${styles.pillRed} ${styles.pillBold}`} title={`${tested.title} (broken mapping)`}>
                                      {tested.id}
                                    </span>
                                  ) : (
                                    <Link key={testedIndex} to={tested.url} className={`${styles.pill} ${styles.pillLinkBlue}`} title={tested.title}>
                                      {tested.id}
                                    </Link>
                                  )
                                )
                              ) : (
                                <span className={`${styles.pill} ${styles.pillGray}`}>None tested</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className={styles.pillGroup}>
                              {summary.missingRequirements.length > 0 ? (
                                summary.missingRequirements.map((missing, missingIndex) =>
                                  missing.url === "#" ? (
                                    <span key={missingIndex} className={`${styles.pill} ${styles.pillRed} ${styles.pillBold}`} title={`${missing.title} (broken mapping)`}>
                                      {missing.id}
                                    </span>
                                  ) : (
                                    <Link key={missingIndex} to={missing.url} className={`${styles.pill} ${styles.pillLinkOrange}`} title={missing.title}>
                                      {missing.id}
                                    </Link>
                                  )
                                )
                              ) : (
                                <span className={`${styles.pill} ${styles.pillGreen}`}>All covered</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className={styles.pillGroup}>
                              {summary.unusedRequirements.length > 0 ? (
                                summary.unusedRequirements.map((unused, unusedIndex) =>
                                  unused.url === "#" ? (
                                    <span key={unusedIndex} className={`${styles.pill} ${styles.pillRed} ${styles.pillBold}`} title={`${unused.title} (broken mapping)`}>
                                      {unused.id}
                                    </span>
                                  ) : (
                                    <Link key={unusedIndex} to={unused.url} className={`${styles.pill} ${styles.pillLinkGray}`} title={unused.title}>
                                      {unused.id}
                                    </Link>
                                  )
                                )
                              ) : (
                                <span className={`${styles.pill} ${styles.pillGray}`}>None</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyState}>No control catalog data available for summarization.</div>
              )}
            </div>
          </div>

          <div>
            <h2 className={styles.sectionHeading}>Test Mapping Summary</h2>
            <p className={styles.sectionSubtitle}>
              Summary of test mappings showing how event codes map to test requirements
            </p>
            <div className={styles.sectionBody}>
              {testMappingSummary && testMappingSummary.length > 0 ? (
                <div className="library-article-body">
                  <table>
                    <thead>
                      <tr>
                        <th>Control Catalog</th>
                        <th>Test Requirement</th>
                        <th>Mapped Tests (Event Code | Total | Passing | Failing)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testMappingSummary.map((mapping, index) => {
                        const requirementData = requirementIndex.get(mapping.testRequirementId);
                        return (
                          <tr key={index}>
                            <td className={styles.cellMedium}>{mapping.controlCatalog}</td>
                            <td>
                              {requirementData ? (
                                <div>
                                  <Link to={requirementData.url} className={`${styles.link} ${styles.fontMono} ${styles.pillBold}`}>
                                    {mapping.testRequirementId}
                                  </Link>
                                  <div className={styles.metaText}>
                                    {requirementData.text || "No description"}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span className={`${styles.fontMono} ${styles.pillRed} ${styles.pillBold}`}>
                                    {mapping.testRequirementId}
                                  </span>
                                  <div className={styles.metaTextItalic}>
                                    Description not available
                                  </div>
                                </div>
                              )}
                            </td>
                            <td>
                              {mapping.mappedTests.map((test, testIndex) => (
                                <div key={testIndex} className={styles.mappingRow}>
                                  <div className={styles.mappingFlex}>
                                    <code className={styles.code}>{test.eventCode}</code>
                                  </div>
                                  <div className={styles.mappingStats}>
                                    <span className={`${styles.pill} ${styles.pillGray} ${styles.pillBold}`}>{test.totalTests}</span>
                                    <span className={`${styles.pill} ${styles.pillGreen} ${styles.pillBold}`}>{test.passingTests}</span>
                                    <span className={`${styles.pill} ${styles.pillRed} ${styles.pillBold}`}>{test.failingTests}</span>
                                  </div>
                                </div>
                              ))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyState}>No test mapping data available.</div>
              )}
            </div>
          </div>

          <div>
            <h2 className={styles.sectionHeading}>Resource Summary</h2>
            <p className={styles.sectionSubtitle}>
              Summary of all resources mentioned in OCSF results
            </p>
            <div className={styles.sectionBody}>
              {resourceSummary && resourceSummary.length > 0 ? (
                <div className="library-article-body">
                  <table>
                    <thead>
                      <tr>
                        <th>Resource Name</th>
                        <th>Resource Type</th>
                        <th>Control Catalogs</th>
                        <th>Total Tests</th>
                        <th>Passing</th>
                        <th>Failing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resourceSummary.map((summary, index) => (
                        <tr key={index}>
                          <td className={styles.fontMono}>
                            <div className={styles.truncatedCell} title={summary.resourceName}>
                              {summary.resourceName}
                            </div>
                          </td>
                          <td><span className={`${styles.pill} ${styles.pillGray}`}>{summary.resourceType}</span></td>
                          <td>
                            <div className={styles.pillGroup}>
                              {summary.catalogs.length > 0 ? (
                                summary.catalogs.map((catalog, catalogIndex) => (
                                  <span key={catalogIndex} className={`${styles.pill} ${styles.pillBlue}`}>{catalog}</span>
                                ))
                              ) : (
                                <span className={`${styles.pill} ${styles.pillGray}`}>No CCC catalogs</span>
                              )}
                            </div>
                          </td>
                          <td><span className={`${styles.pill} ${styles.pillGray} ${styles.pillBold}`}>{summary.totalTests}</span></td>
                          <td><span className={`${styles.pill} ${styles.pillGreen} ${styles.pillBold}`}>{summary.passingTests}</span></td>
                          <td><span className={`${styles.pill} ${styles.pillRed} ${styles.pillBold}`}>{summary.failingTests}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyState}>No resource data available.</div>
              )}
            </div>
          </div>

          <div>
            <h2 className={styles.sectionHeading}>Test Results</h2>
            <p className={styles.sectionSubtitle}>
              OCSF test results filtered for entries with CCC compliance mappings
            </p>
            <div className={styles.sectionBody}>
              {testResultsWithCCC && testResultsWithCCC.length > 0 ? (
                <div className="library-article-body">
                  <table>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Finding</th>
                        <th>Resource Name</th>
                        <th>Resource Type</th>
                        <th>Message</th>
                        <th>Test Requirements</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testResultsWithCCC.map((result) => (
                        <tr key={result.id}>
                          <td>
                            <span className={statusPillClass(result.status_code)}>{result.status_code}</span>
                          </td>
                          <td>
                            <div className={styles.findingTitle}>
                              {result.finding_title || result.name}
                            </div>
                            {result.status_detail && (
                              <div className={styles.statusDetail}>
                                {result.status_detail}
                              </div>
                            )}
                          </td>
                          <td className={styles.fontMono}>
                            <div className={styles.truncatedCell} title={result.resource_name}>
                              {result.resource_name}
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.pill} ${styles.pillGray}`}>{result.resource_type}</span>
                          </td>
                          <td>
                            <div className={styles.messageCell}>{result.message}</div>
                          </td>
                          <td>
                            <div className={styles.pillGroup}>
                              {result.test_requirements?.map((requirementId, index) => {
                                const requirementData = requirementIndex.get(requirementId);
                                if (requirementData) {
                                  return (
                                    <Link key={index} to={requirementData.url} className={`${styles.pill} ${styles.pillLinkBlue} ${styles.fontMono}`} title={`${requirementData.controlTitle}: ${requirementData.text}`}>
                                      {requirementId}
                                    </Link>
                                  );
                                }
                                return (
                                  <span key={index} className={`${styles.pill} ${styles.pillRed} ${styles.fontMono} ${styles.pillBold}`} title="Broken mapping">
                                    {requirementId}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyState}>No test results found with CCC compliance mappings.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
