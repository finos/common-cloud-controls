import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { User } from "../../ccc/User";
import { usePluginData } from "@docusaurus/useGlobalData";

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
  provider: string;
  test_results: string[];
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

export default function CFIRelease({ pageData }: { pageData: ReleasePageData }): React.ReactElement {
  const cccReleases = usePluginData("ccc-pages") as CCCRelease[];
  console.log(JSON.stringify(pageData, null, 2));
  const matchingCCCReleases = []; //cccReleases.find((release) => release.metadata.id === pageData.ccc_reference.id)?.metadata.release_details || [];

  return (
    <Layout title={`CFI - ${pageData.metadata.name}`} description={pageData.metadata.description}>
      <main className="container margin-vert--lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{pageData.metadata.name}</CardTitle>
            <p className="text-muted-foreground">{pageData.metadata.description}</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CCC Reference</CardTitle>
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
                      <Link to={`/ccc/${pageData.ccc_reference.id}/${release.version}`} className="text-primary hover:underline">
                        {release.version}
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
            <CardTitle>Source Code</CardTitle>
          </CardHeader>
          <CardContent>
            <a href={pageData.metadata.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {pageData.metadata.url}
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pageData.metadata.authors.map((author) => (
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.test_results.map((result) => (
                  <TableRow key={result}>
                    <TableCell>
                      <Link to={`/cfi/${pageData.slug}/results/${result}`} className="text-primary hover:underline">
                        {result}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Terraform Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Source</h3>
                <pre className="bg-muted p-4 rounded-md overflow-auto">{pageData.terraform.source}</pre>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">Example Usage</h3>
                <pre className="bg-muted p-4 rounded-md overflow-auto">{pageData.terraform.script}</pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
