import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { RepositoryPageData } from "@site/src/types/cfi";

export default function CFIRepository({ pageData }: { pageData: RepositoryPageData }): React.ReactElement {
  const { repository, configurations, repositorySlug } = pageData;

  // Calculate aggregate statistics across all configurations
  const totalConfigurations = configurations.length;
  const totalTests = configurations.reduce((sum, config) => sum + (config.test_results?.length || 0), 0);
  const totalPassingTests = configurations.reduce((sum, config) => sum + (config.test_results?.filter((r) => r.status_code === "PASS").length || 0), 0);
  const totalFailingTests = configurations.reduce((sum, config) => sum + (config.test_results?.filter((r) => r.status_code === "FAIL").length || 0), 0);

  // Get unique resources across all configurations
  const allResources = new Set<string>();
  configurations.forEach((config) => {
    config.all_ocsf_results?.forEach((result) => {
      if (result.resource_name) {
        allResources.add(result.resource_name);
      }
    });
  });

  // Get unique catalogs across all configurations
  const allCatalogs = new Set<string>();
  configurations.forEach((config) => {
    config.test_results?.forEach((result) => {
      result.test_requirements?.forEach((req) => {
        const catalogId = req.split(".").slice(0, 2).join(".");
        if (catalogId) allCatalogs.add(catalogId);
      });
    });
  });

  return (
    <Layout title={`CFI Repository - ${repository.name}`} description={repository.description}>
      <main className="container margin-vert--lg space-y-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link to="/cfi" className="hover:text-foreground">
            CFI
          </Link>
          <span>/</span>
          <span className="text-foreground">{repositorySlug}</span>
        </nav>

        {/* Repository Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Repository Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium w-32">Name</TableCell>
                  <TableCell>{repository.name}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Description</TableCell>
                  <TableCell>{repository.description}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Repository URL</TableCell>
                  <TableCell>
                    <a href={repository.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      {repository.url}
                    </a>
                  </TableCell>
                </TableRow>
                {repository.downloaded_at && (
                  <TableRow>
                    <TableCell className="font-medium">Downloaded At</TableCell>
                    <TableCell>
                      {new Date(repository.downloaded_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                )}
                {repository.workflow_run_id && (
                  <TableRow>
                    <TableCell className="font-medium">Workflow Status</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${repository.workflow_conclusion === "success" ? "bg-green-100 text-green-800" : repository.workflow_conclusion === "failure" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{repository.workflow_conclusion || repository.workflow_status}</span>
                        <span className="text-sm text-gray-500">Run #{repository.workflow_run_id}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Repository Summary Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Repository Summary</CardTitle>
            <p className="text-sm text-muted-foreground">Aggregate statistics across all configurations in this repository</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium w-48">Total Configurations</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">{totalConfigurations}</span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Total Resources</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">{allResources.size}</span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Total Tests</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 font-medium">{totalTests}</span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Passing Tests</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">{totalPassingTests}</span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Failing Tests</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 font-medium">{totalFailingTests}</span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Catalogs Tested</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(allCatalogs)
                        .sort()
                        .map((catalog, index) => (
                          <Link key={index} to={`/ccc/${catalog}`} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-900 transition-colors">
                            {catalog}
                          </Link>
                        ))}
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Configurations */}
        <Card>
          <CardHeader>
            <CardTitle>Configurations</CardTitle>
            <p className="text-sm text-muted-foreground">All configurations available in this repository</p>
          </CardHeader>
          <CardContent>
            {configurations && configurations.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Configuration</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Tests</TableHead>
                      <TableHead>Pass Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configurations.map((config, index) => {
                      const totalTests = config.test_results?.length || 0;
                      const passingTests = config.test_results?.filter((r) => r.status_code === "PASS").length || 0;
                      const passRate = totalTests > 0 ? Math.round((passingTests / totalTests) * 100) : 0;

                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <Link to={config.slug} className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                              {config.cfi_details.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 uppercase">{config.cfi_details.provider}</span>
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 capitalize">{config.cfi_details.service}</span>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <div className="text-sm whitespace-normal break-words">{config.cfi_details.description}</div>
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 font-medium">{totalTests}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${passRate >= 80 ? "bg-green-100 text-green-800" : passRate >= 60 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>{passRate}%</span>
                              <span className="text-xs text-gray-500">
                                {passingTests}/{totalTests}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No configurations found in this repository.</div>
            )}
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
