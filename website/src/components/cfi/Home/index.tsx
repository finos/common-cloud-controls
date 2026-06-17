import React from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { HomePageData } from "@site/src/types/cfi";
import { formatGeneratedAt } from "@site/src/utils/formatGeneratedAt";

export default function CFIHomeTemplate({ pageData }: { pageData: HomePageData }) {
  const { repositories } = pageData;

  return (
    <Layout title="Compliant Financial Infrastructure" description="CFI behavioural compliance test results">
      <main className="container margin-vert--lg space-y-8">
        <div className="text-center">
          <h1>Compliant Financial Infrastructure</h1>
          <p className="text-xl text-muted-foreground">Implementation of Common Cloud Controls in Infrastructure as Code</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>CFI result sources</CardTitle>
            <p className="text-sm text-muted-foreground">
              Test results are grouped by the GitHub repository that publishes CI artifacts
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Repository</TableHead>
                    <TableHead>Configurations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repositories.map((repository) => (
                    <TableRow key={repository.destination}>
                      <TableCell className="font-medium">
                        <Link to={repository.href} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {repository.description}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <a href={repository.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">
                          {repository.url.replace(/^https?:\/\/github\.com\//, "")}
                        </a>
                      </TableCell>
                      <TableCell>{repository.configurationCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {repositories.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No CFI repositories configured. Check <code>cfi-repositories.json</code> and downloaded test results.
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground text-center">
          Page generated <time dateTime={pageData.generatedAt}>{formatGeneratedAt(pageData.generatedAt)}</time>
        </p>
      </main>
    </Layout>
  );
}
