import React, { useState } from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { usePluginData } from "@docusaurus/useGlobalData";
import { User } from "../../ccc/User";
import { Release } from "@site/src/types/ccc";
import { TestResultItem, TestResultPageData, TestResultType } from "@site/src/types/cfi";

function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}

const resultTypeToBadgeVariant = {
  [TestResultType.PASS]: "default",
  [TestResultType.FAIL]: "destructive",
  [TestResultType.NA]: "secondary",
  [TestResultType.ERROR]: "destructive",
} as const;

interface TestRequirement {
  requirement_id: string;
  requirement_description: string;
  control_id: string;
  ccc_reference: string;
  description: string;
  ccc_release: string;
  ccc_versions: string[];
}

function buildTestRequirements(pageData: TestResultPageData): TestRequirement[] {
  const cccReleaseData = usePluginData("ccc-pages")["ccc-releases"] as Release[];
  const out: Map<string, TestRequirement> = new Map();
  const cccReleaseIds = pageData.configuration.ccc_references;
  const relevantReleases = cccReleaseData.filter((release) => cccReleaseIds.includes(release.metadata.id));

  pageData.results.forEach((result) => {
    relevantReleases.forEach((release) => {
      release.controls.forEach((control) => {
        if (control.test_requirements) {
          control.test_requirements.forEach((testRequirement) => {
            if (testRequirement.id === result.test_requirement_id) {
              const existingRequirement = out.get(testRequirement.id);
              if (existingRequirement) {
                const nv = [...existingRequirement.ccc_versions, release.metadata.release_details[0].version];
                const nv2 = nv.sort((a, b) => a.localeCompare(b)).filter(onlyUnique);
                existingRequirement.ccc_versions = nv2;
              } else {
                out.set(testRequirement.id, {
                  requirement_id: testRequirement.id,
                  requirement_description: testRequirement.text,
                  control_id: control.id,
                  ccc_reference: release.metadata.id,
                  description: testRequirement.text,
                  ccc_release: release.metadata.id,
                  ccc_versions: release.metadata.release_details.map((releaseDetail) => releaseDetail.version),
                });
              }
            }
          });
        }
      });
    });
  });

  return Array.from(out.values()).sort((a, b) => a.requirement_id.localeCompare(b.requirement_id));
}

function createBadge(result: TestResultType) {
  return <Badge variant={resultTypeToBadgeVariant[result]}>{result}</Badge>;
}

interface LinkedTestResults {
  test_requirement: TestRequirement;
  result: TestResultItem;
  key: string;
}

export default function CFITestResult({ pageData }: { pageData: TestResultPageData }): React.ReactElement {
  const testRequirements = buildTestRequirements(pageData);
  const ltrs: LinkedTestResults[] = pageData.results.map((result) => {
    const testRequirement = testRequirements.find((testRequirement) => testRequirement.requirement_id === result.test_requirement_id);
    return {
      test_requirement: testRequirement,
      result: result,
      key: `${testRequirement.requirement_id}-${result.id}`,
    };
  });
  const untestedRequirements = [...testRequirements].filter((testRequirement) => !ltrs.some((ltr) => ltr.test_requirement.requirement_id === testRequirement.requirement_id));

  const sortedLtrs = ltrs.sort((a, b) => a.test_requirement.requirement_id.localeCompare(b.test_requirement.requirement_id));

  // Add state for filters
  const [selectedResult, setSelectedResult] = useState<TestResultType | "all">("all");
  const [selectedVersion, setSelectedVersion] = useState<string>("all");
  const [selectedResource, setSelectedResource] = useState<string>("all");

  // Get unique versions and resources for filter options
  const uniqueVersions = Array.from(new Set(ltrs.flatMap((ltr) => ltr.test_requirement.ccc_versions))).sort();
  const uniqueResources = Array.from(new Set(ltrs.flatMap((ltr) => ltr.result.resources))).sort();

  // Filter the results
  const filteredLtrs = sortedLtrs.filter((ltr) => {
    const matchesResult = selectedResult === "all" || ltr.result.result === selectedResult;
    const matchesVersion = selectedVersion === "all" || ltr.test_requirement.ccc_versions.includes(selectedVersion);
    const matchesResource = selectedResource === "all" || ltr.result.resources.includes(selectedResource);
    console.log(ltr.result.result, selectedResult, matchesResult);
    return matchesResult && matchesVersion && matchesResource;
  });
  console.log("FIltered resutls:", JSON.stringify(pageData, null, 2));
  return (
    <Layout title={`Test Result - ${pageData.result_name}`} description={`Test results for ${pageData.releaseTitle}`}>
      <main className="container margin-vert--lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Results: {pageData.result_name}</CardTitle>
            <p className="text-muted-foreground">
              For{" "}
              <Link className="text-blue-600 hover:text-blue-800 hover:underline" to={pageData.parentSlug}>
                {pageData.releaseTitle}
              </Link>
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="default">Pass</Badge>
                <span>{pageData.results.filter((r) => r.result === TestResultType.PASS).length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">Fail</Badge>
                <span>{pageData.results.filter((r) => r.result === TestResultType.FAIL).length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">N/A</Badge>
                <span>{pageData.results.filter((r) => r.result === TestResultType.NA).length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">Error</Badge>
                <span>{pageData.results.filter((r) => r.result === TestResultType.ERROR).length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Untested Requirements</Badge>
                <span>{untestedRequirements.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {untestedRequirements.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Untested Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requirement ID</TableHead>
                    <TableHead>Requirement Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {untestedRequirements.map((requirement) => (
                    <TableRow key={requirement.requirement_id}>
                      <TableCell>{requirement.requirement_id}</TableCell>
                      <TableCell>{requirement.requirement_description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          ""
        )}

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

                  // Process all test requirements
                  testRequirements.forEach((req) => {
                    req.ccc_versions.forEach((version) => {
                      const key = `${req.ccc_reference}-${version}`;
                      const current = releaseMap.get(key) || { passing: 0, failing: 0 };

                      // Get results for this requirement
                      const resultsForRequirement = pageData.results.filter((result) => result.test_requirement_id === req.requirement_id);

                      // Update counts
                      current.passing += resultsForRequirement.filter((r) => r.result === TestResultType.PASS).length;
                      current.failing += resultsForRequirement.filter((r) => r.result === TestResultType.FAIL || r.result === TestResultType.ERROR).length;

                      releaseMap.set(key, current);
                    });
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

        <Card>
          <CardHeader>
            <CardTitle>Test Results By Control Requirement</CardTitle>
          </CardHeader>
          <CardContent>
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
                  <TableHead>Requirement Description</TableHead>
                  <TableHead>CCC Versions</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Test Result</TableHead>
                  <TableHead>Resources</TableHead>
                  <TableHead>Result Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLtrs.map((ltr) => (
                  <TableRow key={ltr.key}>
                    <TableCell>{ltr.test_requirement.requirement_id}</TableCell>
                    <TableCell>{ltr.test_requirement.requirement_description}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {ltr.test_requirement.ccc_versions.map((version) => (
                          <Badge key={version} variant="secondary" className="text-xs">
                            {version}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{ltr.result.test}</TableCell>
                    <TableCell>{createBadge(ltr.result.result)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {ltr.result.resources.map((resource) => (
                          <Badge key={resource} variant="outline" className="text-xs">
                            {resource}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {ltr.result.message} {ltr.result.further_info_url ? <Link to={ltr.result.further_info_url}>(more)</Link> : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
