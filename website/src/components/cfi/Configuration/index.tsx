import React, { useState } from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { User } from "../../ccc/User";
import { usePluginData } from "@docusaurus/useGlobalData";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../ui/accordion";
import { ConfigurationPageData, TestResultType } from "@site/src/types/cfi";
import { Release } from "@site/src/types/ccc";

export default function CFIConfiguration({ pageData }: { pageData: ConfigurationPageData }): React.ReactElement {
  const cccData = usePluginData("ccc-pages");
  const cccReleases = cccData["ccc-releases"] as Release[];

  const matchingCCCReleases = cccReleases.filter((release) => pageData.configuration.ccc_references.includes(release.metadata.id));

  // Add state for filters
  const [selectedResult, setSelectedResult] = useState<TestResultType | "all">("all");
  const [selectedVersion, setSelectedVersion] = useState<string>("all");
  const [selectedResource, setSelectedResource] = useState<string>("all");

  // Get unique versions and resources for filter options
  const uniqueVersions = Array.from(new Set(pageData.configuration.test_results.flatMap((result) => (result as any).testData?.map((td: any) => td.test_requirement_id?.split("-")[0]).filter(Boolean) || []))).sort();

  const uniqueResources = Array.from(new Set(pageData.configuration.test_results.flatMap((result) => (result as any).testData?.flatMap((td: any) => td.resources || []).filter(Boolean) || []))).sort();

  // Filter the test results
  const filteredTestResults = pageData.configuration.test_results.flatMap(
    (result) =>
      (result as any).testData?.filter((testData: any) => {
        const matchesResult = selectedResult === "all" || testData.result === selectedResult;
        const matchesVersion = selectedVersion === "all" || testData.test_requirement_id?.includes(selectedVersion);
        const matchesResource = selectedResource === "all" || (testData.resources && testData.resources.some((r: string) => r.includes(selectedResource)));
        return matchesResult && matchesVersion && matchesResource;
      }) || []
  );

  return (
    <Layout title={`CFI - ${pageData.configuration.cfi_details.name}`} description={pageData.configuration.cfi_details.description}>
      <main className="container margin-vert--lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>CFI Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID</label>
                  <div className="mt-1">{pageData.configuration.cfi_details.id}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Provider</label>
                  <div className="mt-1">{pageData.configuration.cfi_details.provider}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <div className="mt-1">{pageData.configuration.cfi_details.name}</div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <div className="mt-1">{pageData.configuration.cfi_details.description}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CCC References</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Release Manager</TableHead>
                  <TableHead>Authors</TableHead>
                  <TableHead>Controls</TableHead>
                  <TableHead>Threats</TableHead>
                  <TableHead>Features</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchingCCCReleases.map((release: Release) => (
                  <TableRow key={release.metadata.version}>
                    <TableCell>
                      <Link to={release.slug} className="text-blue-600 hover:text-blue-800 hover:underline">
                        <code className="text-sm bg-muted px-1 py-0.5 rounded">{release.slug}</code>
                      </Link>
                    </TableCell>
                    <TableCell>{release.metadata.version}</TableCell>
                    <TableCell>{release.metadata.release_details?.[0]?.release_manager ? <User name={release.metadata.release_details[0].release_manager.name} githubId={release.metadata.release_details[0].release_manager.github_id} company={release.metadata.release_details[0].release_manager.company} avatarUrl={`https://github.com/${release.metadata.release_details[0].release_manager.github_id}.png`} /> : <span>N/A</span>}</TableCell>
                    <TableCell>{release.metadata.release_details?.[0]?.contributors?.length || 0}</TableCell>
                    <TableCell>{release.controls.length}</TableCell>
                    <TableCell>{release.threats.length}</TableCell>
                    <TableCell>{release.features.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repository Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Repository Name</label>
                  <div className="mt-1">{pageData.configuration.repository.name}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Downloaded At</label>
                  <div className="mt-1">{new Date(pageData.configuration.repository.downloaded_at).toLocaleString()}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Repository URL</label>
                  <div className="mt-1">
                    <Link to={pageData.configuration.repository.url} className="text-blue-600 hover:text-blue-800 hover:underline">
                      {pageData.configuration.repository.url}
                    </Link>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <div className="mt-1">{pageData.configuration.repository.description}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pageData.configuration.cfi_details.authors.map((author) => (
                <User key={author.github_id} name={author.name} githubId={author.github_id} company={author.company} avatarUrl={`https://github.com/${author.github_id}.png`} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {pageData.configuration.test_results.length > 0 ? (
              <div className="space-y-6">
                {/* Summary Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Pass</Badge>
                        <span>{pageData.configuration.test_results.filter((r) => (r as any).testData?.some((td: any) => td.result === TestResultType.PASS)).length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Fail</Badge>
                        <span>{pageData.configuration.test_results.filter((r) => (r as any).testData?.some((td: any) => td.result === TestResultType.FAIL)).length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">N/A</Badge>
                        <span>{pageData.configuration.test_results.filter((r) => (r as any).testData?.some((td: any) => td.result === TestResultType.NA)).length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Error</Badge>
                        <span>{pageData.configuration.test_results.filter((r) => (r as any).testData?.some((td: any) => td.result === TestResultType.ERROR)).length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Results by CCC Release Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Results by CCC Release</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>CCC Reference</TableHead>
                          <TableHead>CCC Version</TableHead>
                          <TableHead>Passing Tests</TableHead>
                          <TableHead>Failing Tests</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          // Create a map to group by CCC Reference and Version
                          const releaseMap = new Map<string, { passing: number; failing: number }>();

                          // Process all test results
                          pageData.configuration.test_results.forEach((result) => {
                            if ((result as any).testData) {
                              (result as any).testData.forEach((testData: any) => {
                                // Find the CCC reference for this test requirement
                                const cccRef = pageData.configuration.ccc_references.find((ref) => testData.test_requirement_id?.includes(ref));
                                if (cccRef) {
                                  const key = `${cccRef}-v1`; // Assuming single version for now
                                  const current = releaseMap.get(key) || { passing: 0, failing: 0 };

                                  if (testData.result === TestResultType.PASS) {
                                    current.passing++;
                                  } else if (testData.result === TestResultType.FAIL || testData.result === TestResultType.ERROR) {
                                    current.failing++;
                                  }

                                  releaseMap.set(key, current);
                                }
                              });
                            }
                          });

                          // Convert map to array of rows
                          return Array.from(releaseMap.entries()).map(([key, counts]) => {
                            const [cccReference, version] = key.split("-");
                            return (
                              <TableRow key={key}>
                                <TableCell>{cccReference}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-xs">
                                    {version}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="default">{counts.passing}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="destructive">{counts.failing}</Badge>
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Results By Control Requirement Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Results By Control Requirement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Filter Controls */}
                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Test Result:</label>
                        <select className="rounded-md border border-input bg-background px-3 py-1 text-sm" value={selectedResult} onChange={(e) => setSelectedResult(e.target.value as TestResultType | "all")}>
                          <option value="all">All</option>
                          {Object.values(TestResultType).map((result) => (
                            <option key={result} value={result}>
                              {result}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">CCC Version:</label>
                        <select className="rounded-md border border-input bg-background px-3 py-1 text-sm" value={selectedVersion} onChange={(e) => setSelectedVersion(e.target.value)}>
                          <option value="all">All</option>
                          {uniqueVersions.map((version) => (
                            <option key={version} value={version}>
                              {version}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Resource:</label>
                        <select className="rounded-md border border-input bg-background px-3 py-1 text-sm" value={selectedResource} onChange={(e) => setSelectedResource(e.target.value)}>
                          <option value="all">All</option>
                          {uniqueResources.map((resource) => (
                            <option key={resource} value={resource}>
                              {resource}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Requirement ID</TableHead>
                          <TableHead>Test</TableHead>
                          <TableHead>Test Result</TableHead>
                          <TableHead>Resources</TableHead>
                          <TableHead>Result Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTestResults.map((testData: any, index: number) => (
                          <TableRow key={`${testData.id || index}`}>
                            <TableCell>{testData.test_requirement_id}</TableCell>
                            <TableCell>{testData.test}</TableCell>
                            <TableCell>
                              <Badge variant={testData.result === TestResultType.PASS ? "default" : testData.result === TestResultType.FAIL ? "destructive" : testData.result === TestResultType.ERROR ? "destructive" : "secondary"}>{testData.result}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {testData.resources?.map((resource: string, resIndex: number) => (
                                  <Badge key={resIndex} variant="outline" className="text-xs">
                                    {resource}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              {testData.message} {testData.further_info_url ? <Link to={testData.further_info_url}>(more)</Link> : ""}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No test results available yet.</p>
                <p className="text-sm">Test results will appear here after the next CFI scan.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
