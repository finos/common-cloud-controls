import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { usePluginData } from "@docusaurus/useGlobalData";
import { User } from "../../ccc/User";

export enum TestResultType {
  PASS = "pass",
  FAIL = "fail",
  NA = "na",
  ERROR = "error",
}

export interface TestResultItem {
  test_requirement_id: string;
  test_id: string;
  result: TestResultType;
  description: string;
}

interface TestResultPageData {
  slug: string;
  result_name: string;
  result_path: string;
  releaseTitle: string;
  ccc_reference: {
    version: string;
    id: string;
  };
  test_results: TestResultItem[];
}

interface CCCRelease {
  metadata: {
    id: string;
    release_details: Array<{
      version: string;
      assurance_level: string | null;
      threat_model_url: string | null;
      threat_model_author: string | null;
      red_team: string | null;
      red_team_exercise_url: string | null;
      release_manager: {
        name: string;
        github_id: string;
        company: string;
      };
      change_log: string[];
      contributors: Array<{
        name: string;
        github_id: string;
        company: string;
      }>;
    }>;
  };
}

const resultTypeToBadgeVariant = {
  [TestResultType.PASS]: "default",
  [TestResultType.FAIL]: "destructive",
  [TestResultType.NA]: "secondary",
  [TestResultType.ERROR]: "destructive",
} as const;

export default function CFITestResult({ pageData }: { pageData: TestResultPageData }): React.ReactElement {
  const cccReleases = usePluginData("ccc-pages")["ccc-releases"] as CCCRelease[];
  const matchingCCCReleases = cccReleases.find((release) => release.metadata.id === pageData.ccc_reference.id)?.metadata.release_details || [];

  return (
    <Layout title={`Test Result - ${pageData.result_name}`} description={`Test results for ${pageData.releaseTitle}`}>
      <main className="container margin-vert--lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Results: {pageData.result_name}</CardTitle>
            <p className="text-muted-foreground">
              For <Link to={`/cfi/${pageData.slug}`}>{pageData.releaseTitle}</Link>
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CCC References</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Assurance Level</TableHead>
                  <TableHead>Release Manager</TableHead>
                  <TableHead>Threat Model</TableHead>
                  <TableHead>Red Team</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchingCCCReleases.map((release) => (
                  <TableRow key={release.version}>
                    <TableCell>
                      <Link to={release.link} className="text-primary hover:underline">
                        <code className="text-sm bg-muted px-1 py-0.5 rounded">{release.slug}</code>
                      </Link>
                    </TableCell>
                    <TableCell>{release.assurance_level && <Badge variant="outline">{release.assurance_level}</Badge>}</TableCell>
                    <TableCell>
                      <User name={release.release_manager.name} githubId={release.release_manager.github_id} company={release.release_manager.company} avatarUrl={`https://github.com/${release.release_manager.github_id}.png`} />
                    </TableCell>
                    <TableCell>
                      {release.threat_model_url && (
                        <a href={release.threat_model_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {release.threat_model_author || "View"}
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      {release.red_team && (
                        <a href={release.red_team_exercise_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {release.red_team}
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Requirement ID</TableHead>
                  <TableHead>Test ID</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.test_results.map((result, index) => (
                  <TableRow key={`${result.test_requirement_id}-${index}`}>
                    <TableCell>{result.test_requirement_id}</TableCell>
                    <TableCell>{result.test_id}</TableCell>
                    <TableCell>
                      <Badge variant={resultTypeToBadgeVariant[result.result]}>{result.result}</Badge>
                    </TableCell>
                    <TableCell>{result.description}</TableCell>
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
