import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { User } from "../../ccc/User";

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

export default function CFIRelease({ pageData }: { pageData: ReleasePageData }): React.ReactElement {
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
            <p>
              This implementation references{" "}
              <Link to={`/ccc/${pageData.ccc_reference.id}`}>
                {pageData.ccc_reference.id} (v{pageData.ccc_reference.version})
              </Link>
            </p>
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
      </main>
    </Layout>
  );
}
