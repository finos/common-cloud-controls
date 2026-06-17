import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { ConfigurationPageData } from "@site/src/types/cfi";
import { formatGeneratedAt } from "@site/src/utils/formatGeneratedAt";

export default function CFIConfiguration({ pageData }: { pageData: ConfigurationPageData }): React.ReactElement {
  const { configuration, configurationResultSummaries } = pageData;
  const { cfi_details, source_details, results_relative_path } = configuration;

  const complianceRepoUrl = source_details?.repository_url;
  const terraformUrl =
    complianceRepoUrl && cfi_details.path ? `${complianceRepoUrl}/tree/main/${cfi_details.path}` : null;

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
            <div className="library-article-body"><table>
              <tbody>
                <tr>
                  <td className="font-medium w-32">ID</td>
                  <td>{cfi_details.id}</td>
                </tr>
                <tr>
                  <td className="font-medium">Provider</td>
                  <td>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 uppercase">{cfi_details.provider}</span>
                  </td>
                </tr>
                <tr>
                  <td className="font-medium">Name</td>
                  <td>{cfi_details.name}</td>
                </tr>
                <tr>
                  <td className="font-medium">Branch</td>
                  <td>{source_details.branch}</td>
                </tr>
                <tr>
                  <td className="font-medium">Description</td>
                  <td>{cfi_details.description}</td>
                </tr>
                <tr>
                  <td className="font-medium">Service</td>
                  <td>
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 capitalize">{cfi_details.service}</span>
                  </td>
                </tr>
                <tr>
                  <td className="font-medium">Path</td>
                  <td>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">{cfi_details.path}</code>
                  </td>
                </tr>
                {cfi_details.git && (
                  <tr>
                    <td className="font-medium">GitHub Link</td>
                    <td>
                      <a href={cfi_details.git} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        View GitHub Repository
                      </a>
                    </td>
                  </tr>
                )}
                {terraformUrl && (
                  <tr>
                    <td className="font-medium">Terraform Files</td>
                    <td>
                      <a href={terraformUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        View Terraform Files
                      </a>
                    </td>
                  </tr>
                )}
              </tbody>
            </table></div>
          </CardContent>
        </Card>

        {/* Artifact / layout (source-details + results paths) */}
        <Card>
          <CardHeader>
            <CardTitle>CFI results source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="library-article-body"><table>
              <tbody>
                <tr>
                  <td className="font-medium w-32">Test data folder</td>
                  <td>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">test-results/{results_relative_path}</code>
                  </td>
                </tr>
                {source_details ? (
                  <>
                    <tr>
                      <td className="font-medium">Repository description</td>
                      <td>{source_details.repository_description}</td>
                    </tr>
                    <tr>
                      <td className="font-medium">Repository URL</td>
                      <td>
                        <a href={source_details.repository_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                          </svg>
                          {source_details.repository_url}
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium">Result ID</td>
                      <td>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">{source_details.result_id}</code>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium">Branch</td>
                      <td>{source_details.branch}</td>
                    </tr>
                    <tr>
                      <td className="font-medium">CI artifact created</td>
                      <td>
                        <time dateTime={source_details.artifact_created_at}>{formatGeneratedAt(source_details.artifact_created_at)}</time>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium">Fetched for site</td>
                      <td>
                        <time dateTime={source_details.downloaded_at}>{formatGeneratedAt(source_details.downloaded_at)}</time>
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={2} className="text-sm text-muted-foreground">
                      No <code className="text-xs">source-details.json</code> for this configuration.
                    </td>
                  </tr>
                )}
              </tbody>
            </table></div>
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
                <div className="library-article-body"><table>
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Product</th>
                      <th>Version</th>
                      <th>Total Tests</th>
                      <th>Passing</th>
                      <th>Failing</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configurationResultSummaries.map((summary, index) => (
                      <tr key={index}>
                        <td>
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">{summary.vendor}</span>
                        </td>
                        <td>
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">{summary.product}</span>
                        </td>
                        <td>
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">{summary.version}</span>
                        </td>
                        <td>
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 font-medium">{summary.totalTests}</span>
                        </td>
                        <td>
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">{summary.passingTests}</span>
                        </td>
                        <td>
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 font-medium">{summary.failingTests}</span>
                        </td>
                        <td>
                          <Link to={summary.slug} className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium">
                            View Details →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
            ) : (
              <div className="text-center py-8 text-gray-500">No configuration results available.</div>
            )}
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
