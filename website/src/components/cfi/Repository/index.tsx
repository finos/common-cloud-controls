import React from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { CFIRepositoryPageData } from "@site/src/types/cfi";
import { configurationSidebarLabel } from "@site/src/utils/cfiNavigation";
import { formatGeneratedAt } from "@site/src/utils/formatGeneratedAt";

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
      <main className="container margin-vert--lg space-y-8">
        <div>
          <h1>{repository.description}</h1>
          <p className="text-muted-foreground">
            Behavioural compliance results downloaded from{" "}
            <a href={repository.url} target="_blank" rel="noopener noreferrer">
              {repository.url.replace(/^https?:\/\/github\.com\//, "")}
            </a>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configurations</CardTitle>
            <p className="text-sm text-muted-foreground">
              {sortedConfigurations.length} configuration{sortedConfigurations.length === 1 ? "" : "s"} in this results set
            </p>
          </CardHeader>
          <CardContent>
            {sortedConfigurations.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Result sets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedConfigurations.map((configuration) => {
                      const configPagePath = `/cfi/${configuration.results_relative_path}`;
                      const summaries = configurationResultSummariesByPath[configuration.results_relative_path] ?? [];

                      return (
                        <TableRow key={configuration.results_relative_path}>
                          <TableCell>
                            <Link to={configPagePath} className="text-blue-600 hover:text-blue-800 hover:underline">
                              {configuration.cfi_details.id}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 uppercase">
                              {configuration.cfi_details.provider}
                            </span>
                          </TableCell>
                          <TableCell>{configuration.cfi_details.name}</TableCell>
                          <TableCell>{configuration.source_details?.branch ?? "—"}</TableCell>
                          <TableCell>{summaries.length}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No configurations found for this repository.</div>
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
