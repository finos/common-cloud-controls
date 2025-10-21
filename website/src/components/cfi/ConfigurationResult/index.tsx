import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { ConfigurationResultPageData, ControlCatalogSummary, ResourceSummary, TestResultItem, TestSummary, TestMappingSummary, TestMappingDetail } from "@site/src/types/cfi";
import { useCCCData, findAssessmentRequirements, getControlUrl } from "@site/src/utils/cccDataLookup";

// Helper function to extract catalog ID from test requirement
function extractCatalogId(testRequirement: string): string {
  // Extract catalog from format like "CCC.ObjStor.C01.TR01" -> "CCC.ObjStor"
  const parts = testRequirement.split(".");
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : testRequirement;
}

// Helper function to generate catalog component URL
function getCatalogComponentUrl(catalogId: string): string {
  // Catalog IDs like "CCC.ObjStor" map to component URLs like "/ccc/CCC.ObjStor"
  return `/ccc/${catalogId}`;
}

// Helper function to generate catalog summary data
function generateCatalogSummary(testResults: TestResultItem[], releases: any[]): ControlCatalogSummary[] {
  const summaryMap = new Map<string, ControlCatalogSummary>();

  // First, collect all tested requirements by catalog
  const testedRequirementsByCatalog = new Map<string, Set<string>>();

  testResults.forEach((result) => {
    // Get unique catalog IDs for this test result to avoid double counting
    const catalogsInThisResult = new Set<string>();

    result.test_requirements?.forEach((testReq) => {
      const catalogId = extractCatalogId(testReq);
      catalogsInThisResult.add(catalogId);

      // Track which requirements are actually tested for this catalog
      if (!testedRequirementsByCatalog.has(catalogId)) {
        testedRequirementsByCatalog.set(catalogId, new Set());
      }
      testedRequirementsByCatalog.get(catalogId)!.add(testReq);
    });

    // Now for each unique catalog ID, count this test result once and collect all resources
    catalogsInThisResult.forEach((catalogId) => {
      if (!summaryMap.has(catalogId)) {
        // Generate URL to the catalog component page
        const catalogUrl = getCatalogComponentUrl(catalogId);

        summaryMap.set(catalogId, {
          catalogId,
          catalogUrl,
          resources: [],
          totalTests: 0,
          passingTests: 0,
          failingTests: 0,
          testedRequirements: [],
          missingRequirements: [],
        });
      }

      const summary = summaryMap.get(catalogId)!;
      summary.totalTests++;

      // Add all resources from this test result to the catalog's resource list
      result.resources?.forEach((resource) => {
        if (!summary.resources.includes(resource)) {
          summary.resources.push(resource);
        }
      });

      if (result.status_code === "PASS") {
        summary.passingTests++;
      } else if (result.status_code === "FAIL") {
        summary.failingTests++;
      }
    });
  });

  // Now find missing requirements for each catalog
  summaryMap.forEach((summary, catalogId) => {
    const testedRequirements = testedRequirementsByCatalog.get(catalogId) || new Set();

    // Find all requirements in this catalog from the releases data
    const allRequirementsInCatalog = new Set<string>();
    releases.forEach((release) => {
      release.controls.forEach((control) => {
        // Check if this control belongs to the catalog by matching the release metadata ID
        if (release.metadata.id === catalogId) {
          control.test_requirements?.forEach((req) => {
            allRequirementsInCatalog.add(req.id);
          });
        }
      });
    });

    // Find missing requirements
    // Filter to only include requirements that match this catalog
    const missingRequirements = Array.from(allRequirementsInCatalog).filter((reqId) => !testedRequirements.has(reqId) && extractCatalogId(reqId) === catalogId);

    // Convert tested requirements to objects with URLs and titles
    // Filter to only include requirements that match this catalog
    const testedRequirementsArray = Array.from(testedRequirements).filter((reqId) => extractCatalogId(reqId) === catalogId);
    summary.testedRequirements = testedRequirementsArray.map((reqId) => {
      // Find the requirement data to get title and generate URL
      let title = reqId;
      let url = "#";

      for (const release of releases) {
        if (release.metadata.id === catalogId) {
          for (const control of release.controls) {
            const requirement = control.test_requirements?.find((req) => req.id === reqId);
            if (requirement) {
              title = requirement.text || reqId;
              url = getControlUrl(release, control, reqId);
              break;
            }
          }
        }
      }

      return { id: reqId, url, title };
    });

    // Convert missing requirements to objects with URLs and titles
    summary.missingRequirements = missingRequirements.map((reqId) => {
      // Find the requirement data to get title and generate URL
      let title = reqId;
      let url = "#";

      for (const release of releases) {
        if (release.metadata.id === catalogId) {
          for (const control of release.controls) {
            const requirement = control.test_requirements?.find((req) => req.id === reqId);
            if (requirement) {
              title = requirement.text || reqId;
              url = getControlUrl(release, control, reqId);
              break;
            }
          }
        }
      }

      return { id: reqId, url, title };
    });
  });

  // Sort resources within each summary and sort summaries by catalog ID
  const summaries = Array.from(summaryMap.values());
  summaries.forEach((summary) => {
    summary.resources.sort();
    summary.testedRequirements.sort((a, b) => a.id.localeCompare(b.id));
    summary.missingRequirements.sort((a, b) => a.id.localeCompare(b.id));
  });

  return summaries.sort((a, b) => a.catalogId.localeCompare(b.catalogId));
}

// Helper function to generate resource summary data from all OCSF results
function generateResourceSummary(testResults: TestResultItem[]): ResourceSummary[] {
  const resourceMap = new Map<string, ResourceSummary>();

  testResults.forEach((result) => {
    const resourceName = result.resource_name || "Unknown Resource";
    const resourceType = result.resource_type || "Unknown Type";
    const key = `${resourceName}-${resourceType}`;

    if (!resourceMap.has(key)) {
      resourceMap.set(key, {
        resourceName,
        resourceType,
        catalogs: [],
        totalTests: 0,
        passingTests: 0,
        failingTests: 0,
      });
    }

    const summary = resourceMap.get(key)!;
    summary.totalTests++;

    // Collect unique catalogs for this resource
    result.test_requirements?.forEach((testReq) => {
      const catalogId = extractCatalogId(testReq);
      if (!summary.catalogs.includes(catalogId)) {
        summary.catalogs.push(catalogId);
      }
    });

    if (result.status_code === "PASS") {
      summary.passingTests++;
    } else if (result.status_code === "FAIL") {
      summary.failingTests++;
    }
  });

  // Sort catalogs within each summary and sort summaries by resource name
  const summaries = Array.from(resourceMap.values());
  summaries.forEach((summary) => {
    summary.catalogs.sort();
  });

  return summaries.sort((a, b) => a.resourceName.localeCompare(b.resourceName));
}

// Helper function to generate aggregate test summary data from test results
function generateTestSummary(testResults: TestResultItem[]) {
  const uniqueResources = new Set<string>();
  const uniqueCatalogs = new Set<string>();
  let totalTests = 0;
  let passingTests = 0;
  let failingTests = 0;

  testResults.forEach((result) => {
    // Count unique resources
    const resourceName = result.resource_name || "Unknown Resource";
    const resourceType = result.resource_type || "Unknown Type";
    const resourceKey = `${resourceName}-${resourceType}`;
    uniqueResources.add(resourceKey);

    // Count tests
    totalTests++;
    if (result.status_code === "PASS") {
      passingTests++;
    } else if (result.status_code === "FAIL") {
      failingTests++;
    }

    // Collect unique catalogs
    result.test_requirements?.forEach((testReq) => {
      const catalogId = extractCatalogId(testReq);
      uniqueCatalogs.add(catalogId);
    });
  });

  return {
    resourcesInConfiguration: uniqueResources.size,
    countOfTests: totalTests,
    passingTests,
    failingTests,
    catalogsTested: Array.from(uniqueCatalogs).sort(),
  };
}

// Helper function to generate test mapping summary data
function generateTestMappingSummary(testResults: TestResultItem[]): TestMappingSummary[] {
  // First, collect all event code mappings by catalog and test requirement
  const eventCodeMap = new Map<string, Map<string, TestMappingDetail>>();

  testResults.forEach((result) => {
    const eventCode = result.test || "Unknown Event Code";

    result.test_requirements?.forEach((testReq) => {
      const catalogId = extractCatalogId(testReq);
      const requirementKey = `${catalogId}-${testReq}`;

      if (!eventCodeMap.has(requirementKey)) {
        eventCodeMap.set(requirementKey, new Map<string, TestMappingDetail>());
      }

      const eventMap = eventCodeMap.get(requirementKey)!;
      if (!eventMap.has(eventCode)) {
        eventMap.set(eventCode, {
          eventCode: eventCode,
          totalTests: 0,
          passingTests: 0,
          failingTests: 0,
        });
      }

      const detail = eventMap.get(eventCode)!;
      detail.totalTests++;

      if (result.status_code === "PASS") {
        detail.passingTests++;
      } else if (result.status_code === "FAIL") {
        detail.failingTests++;
      }
    });
  });

  // Convert to the nested structure
  const summaryMap = new Map<string, TestMappingSummary>();

  eventCodeMap.forEach((eventMap, requirementKey) => {
    // Split the requirement key back to catalog and test requirement
    // Format: "CCC.ObjStor-CCC.ObjStor.C06.TR01" -> catalog: "CCC.ObjStor", testReq: "CCC.ObjStor.C06.TR01"
    const dashIndex = requirementKey.indexOf("-");
    const catalogId = requirementKey.substring(0, dashIndex);
    const testReq = requirementKey.substring(dashIndex + 1);

    if (!summaryMap.has(requirementKey)) {
      summaryMap.set(requirementKey, {
        controlCatalog: catalogId,
        testRequirementId: testReq,
        mappedTests: [],
      });
    }

    const summary = summaryMap.get(requirementKey)!;
    summary.mappedTests = Array.from(eventMap.values()).sort((a, b) => a.eventCode.localeCompare(b.eventCode));
  });

  // Sort by control catalog, then by test requirement ID
  return Array.from(summaryMap.values()).sort((a, b) => {
    if (a.controlCatalog !== b.controlCatalog) {
      return a.controlCatalog.localeCompare(b.controlCatalog);
    }
    return a.testRequirementId.localeCompare(b.testRequirementId);
  });
}

export default function CFIConfigurationResult({ pageData }: { pageData: ConfigurationResultPageData }): React.ReactElement {
  const { configuration, configurationResult } = pageData;
  const { cfi_details } = configuration;
  const { releases } = useCCCData();

  // Use test results from this specific configuration result
  const testResults = configurationResult.test_results;

  // Filter for results with CCC compliance mappings
  const testResultsWithCCC = testResults.filter((result) => result.test_requirements && result.test_requirements.length > 0);

  // Generate catalog summary data
  const catalogSummary = testResultsWithCCC.length > 0 ? generateCatalogSummary(testResultsWithCCC, releases) : [];

  // Generate resource summary data from test results
  const resourceSummary = testResults.length > 0 ? generateResourceSummary(testResults) : [];

  // Generate test summary data
  const testSummary = testResultsWithCCC.length > 0 ? generateTestSummary(testResultsWithCCC) : null;

  // Generate test mapping summary data
  const testMappingSummary = testResultsWithCCC.length > 0 ? generateTestMappingSummary(testResultsWithCCC) : [];

  return (
    <Layout title={`${configurationResult.product} ${configurationResult.version} - ${cfi_details.name}`} description={`Test results for ${configurationResult.vendor} ${configurationResult.product} ${configurationResult.version}`}>
      <main className="container margin-vert--lg space-y-6">
        {/* Configuration Result Header */}
        <Card>
          <CardHeader>
            <CardTitle>
              {configurationResult.product} {configurationResult.version}
            </CardTitle>
            <p className="text-sm text-muted-foreground">Test results for this specific product, vendor, and version combination</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium w-32">Vendor</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">{configurationResult.vendor}</span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Product</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">{configurationResult.product}</span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Version</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">{configurationResult.version}</span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Test Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Test Summary</CardTitle>
            <p className="text-sm text-muted-foreground">Aggregate summary of all tests for this configuration result</p>
          </CardHeader>
          <CardContent>
            {testSummary ? (
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium w-48">Resources In Configuration</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">{testSummary.resourcesInConfiguration}</span>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Count of Tests</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 font-medium">{testSummary.countOfTests}</span>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Passing Tests</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">{testSummary.passingTests}</span>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Failing Tests</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 font-medium">{testSummary.failingTests}</span>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Catalogs Tested</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {testSummary.catalogsTested.length > 0 ? (
                          testSummary.catalogsTested.map((catalog, catalogIndex) => (
                            <Link key={catalogIndex} to={getCatalogComponentUrl(catalog)} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-900 transition-colors">
                              {catalog}
                            </Link>
                          ))
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">No CCC catalogs</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">No test summary data available.</div>
            )}
          </CardContent>
        </Card>

        {/* Control Catalog Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Control Catalog Summary</CardTitle>
            <p className="text-sm text-muted-foreground">Summary of test results grouped by control catalog and resource</p>
          </CardHeader>
          <CardContent>
            {catalogSummary && catalogSummary.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Control Catalog</TableHead>
                      <TableHead>Resources</TableHead>
                      <TableHead>Total Tests</TableHead>
                      <TableHead>Passing</TableHead>
                      <TableHead>Failing</TableHead>
                      <TableHead>Tested Requirements</TableHead>
                      <TableHead>Missing Requirements</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catalogSummary.map((summary, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Link to={summary.catalogUrl} className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                            {summary.catalogId}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <div className="flex flex-wrap gap-1">
                            {summary.resources.map((resource, resourceIndex) => (
                              <span key={resourceIndex} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800" title={resource}>
                                {resource.length > 20 ? `${resource.substring(0, 20)}...` : resource}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 font-medium">{summary.totalTests}</span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">{summary.passingTests}</span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 font-medium">{summary.failingTests}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {summary.testedRequirements.length > 0 ? (
                              summary.testedRequirements.map((tested, testedIndex) =>
                                tested.url === "#" ? (
                                  <span key={testedIndex} className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 font-medium" title={`${tested.title} (broken mapping)`}>
                                    {tested.id}
                                  </span>
                                ) : (
                                  <Link key={testedIndex} to={tested.url} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-900 transition-colors" title={tested.title}>
                                    {tested.id}
                                  </Link>
                                )
                              )
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">None tested</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {summary.missingRequirements.length > 0 ? (
                              summary.missingRequirements.map((missing, missingIndex) =>
                                missing.url === "#" ? (
                                  <span key={missingIndex} className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 font-medium" title={`${missing.title} (broken mapping)`}>
                                    {missing.id}
                                  </span>
                                ) : (
                                  <Link key={missingIndex} to={missing.url} className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 hover:bg-orange-200 hover:text-orange-900 transition-colors" title={missing.title}>
                                    {missing.id}
                                  </Link>
                                )
                              )
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">All covered</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No control catalog data available for summarization.</div>
            )}
          </CardContent>
        </Card>

        {/* Test Mapping Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Test Mapping Summary</CardTitle>
            <p className="text-sm text-muted-foreground">Summary of test mappings showing how event codes map to test requirements</p>
          </CardHeader>
          <CardContent>
            {testMappingSummary && testMappingSummary.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Control Catalog</TableHead>
                      <TableHead>Test Requirement</TableHead>
                      <TableHead>Mapped Tests (Event Code | Total | Passing | Failing)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testMappingSummary.map((mapping, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Link to={getCatalogComponentUrl(mapping.controlCatalog)} className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                            {mapping.controlCatalog}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const requirementData = findAssessmentRequirements(releases, [mapping.testRequirementId])[0];
                            if (requirementData) {
                              const { requirement, control, release } = requirementData;
                              const linkUrl = getControlUrl(release, control, requirement.id);
                              return (
                                <div>
                                  <Link to={linkUrl} className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-sm font-medium">
                                    {mapping.testRequirementId}
                                  </Link>
                                  <div className="text-sm text-gray-600 mt-1">{requirement.text || "No description"}</div>
                                </div>
                              );
                            } else {
                              return (
                                <div>
                                  <span className="font-mono text-sm text-red-600 font-medium">{mapping.testRequirementId}</span>
                                  <div className="text-sm text-gray-500 italic mt-1">Description not available</div>
                                </div>
                              );
                            }
                          })()}
                        </TableCell>
                        <TableCell className="w-full">
                          <div className="p-2 rounded">
                            <div className="w-full">
                              {mapping.mappedTests.map((test, testIndex) => (
                                <div key={testIndex} className="flex items-center justify-between py-1 border-b border-gray-200 last:border-b-0">
                                  <div className="flex-1 min-w-0">
                                    <code className="bg-white px-2 py-1 rounded text-xs">{test.eventCode}</code>
                                  </div>
                                  <div className="flex items-center gap-2 ml-4">
                                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 font-medium">{test.totalTests}</span>
                                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">{test.passingTests}</span>
                                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 font-medium">{test.failingTests}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No test mapping data available.</div>
            )}
          </CardContent>
        </Card>

        {/* Resource Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Summary</CardTitle>
            <p className="text-sm text-muted-foreground">Summary of all resources mentioned in OCSF results</p>
          </CardHeader>
          <CardContent>
            {resourceSummary && resourceSummary.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource Name</TableHead>
                      <TableHead>Resource Type</TableHead>
                      <TableHead>Control Catalogs</TableHead>
                      <TableHead>Total Tests</TableHead>
                      <TableHead>Passing</TableHead>
                      <TableHead>Failing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resourceSummary.map((summary, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">
                          <div className="truncate max-w-xs" title={summary.resourceName}>
                            {summary.resourceName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{summary.resourceType}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {summary.catalogs.length > 0 ? (
                              summary.catalogs.map((catalog, catalogIndex) => (
                                <Link key={catalogIndex} to={getCatalogComponentUrl(catalog)} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-900 transition-colors">
                                  {catalog}
                                </Link>
                              ))
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">No CCC catalogs</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 font-medium">{summary.totalTests}</span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">{summary.passingTests}</span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 font-medium">{summary.failingTests}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No resource data available.</div>
            )}
          </CardContent>
        </Card>

        {/* OCSF Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <p className="text-sm text-muted-foreground">OCSF test results filtered for entries with CCC compliance mappings</p>
          </CardHeader>
          <CardContent>
            {testResultsWithCCC && testResultsWithCCC.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Finding</TableHead>
                      <TableHead>Resource Name</TableHead>
                      <TableHead>Resource Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Test Requirements</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testResultsWithCCC.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${result.status_code === "PASS" ? "bg-green-100 text-green-800" : result.status_code === "FAIL" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{result.status_code}</span>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="font-medium text-sm whitespace-normal break-words">{result.finding_title || result.name}</div>
                          {result.status_detail && <div className="text-xs text-gray-600 mt-1 whitespace-normal break-words">{result.status_detail}</div>}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <div className="truncate max-w-xs" title={result.resource_name}>
                            {result.resource_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{result.resource_type}</span>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="text-sm whitespace-normal break-words">{result.message}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {result.test_requirements?.map((requirementId, index) => {
                              const requirementData = findAssessmentRequirements(releases, [requirementId])[0];
                              if (requirementData) {
                                const { requirement, control, release } = requirementData;
                                const linkUrl = getControlUrl(release, control, requirement.id);
                                return (
                                  <Link key={index} to={linkUrl} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-mono hover:bg-blue-200 hover:text-blue-900 transition-colors" title={`${control.title}: ${requirement.text}`}>
                                    {requirementId}
                                  </Link>
                                );
                              } else {
                                // Fallback for requirements not found in CCC data (broken mapping)
                                return (
                                  <span key={index} className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 font-mono font-medium" title="Broken mapping">
                                    {requirementId}
                                  </span>
                                );
                              }
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No test results found with CCC compliance mappings.</div>
            )}
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
