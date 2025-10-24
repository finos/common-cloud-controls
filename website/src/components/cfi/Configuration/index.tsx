import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { ConfigurationPageData } from "@site/src/types/cfi";

export default function CFIConfiguration({ pageData }: { pageData: ConfigurationPageData }): React.ReactElement {
  const { configuration, configurationResultSummaries } = pageData;
  const { cfi_details, repository } = configuration;

  // Generate Terraform file URL by combining repository URL with the path
  const terraformUrl = repository.url && cfi_details.path ? `${repository.url}/tree/main/${cfi_details.path}` : null;

  return (
    <Layout title={`CFI - ${cfi_details.name}`} description={cfi_details.description}>
      <main className="container margin-vert--lg space-y-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link to="/cfi" className="hover:text-foreground">
            CFI
          </Link>
          <span>/</span>
          <span className="text-foreground">{cfi_details.id}</span>
        </nav>

        {/* Configuration Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium w-32">ID</TableCell>
                  <TableCell>{cfi_details.id}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Provider</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 uppercase">{cfi_details.provider}</span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Name</TableCell>
                  <TableCell>{cfi_details.name}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Description</TableCell>
                  <TableCell>{cfi_details.description}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Service</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 capitalize">{cfi_details.service}</span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Path</TableCell>
                  <TableCell>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">{cfi_details.path}</code>
                  </TableCell>
                </TableRow>
                {cfi_details.git && (
                  <TableRow>
                    <TableCell className="font-medium">GitHub Link</TableCell>
                    <TableCell>
                      <a href={cfi_details.git} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        View GitHub Repository
                      </a>
                    </TableCell>
                  </TableRow>
                )}
                {terraformUrl && (
                  <TableRow>
                    <TableCell className="font-medium">Terraform Files</TableCell>
                    <TableCell>
                      <a href={terraformUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        View Terraform Files
                      </a>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Repository Information */}
        <Card>
          <CardHeader>
            <CardTitle>Repository Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium w-32">Repository Name</TableCell>
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

        {/* Configuration Results */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Results</CardTitle>
            <p className="text-sm text-muted-foreground">Test results partitioned by product, vendor, and version</p>
          </CardHeader>
          <CardContent>
            {configurationResultSummaries && configurationResultSummaries.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Total Tests</TableHead>
                      <TableHead>Passing</TableHead>
                      <TableHead>Failing</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configurationResultSummaries.map((summary, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">{summary.vendor}</span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">{summary.product}</span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">{summary.version}</span>
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
                          <Link to={summary.slug} className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium">
                            View Details →
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No configuration results available.</div>
            )}
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
