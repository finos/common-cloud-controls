import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { User } from "../../ccc/User";
import { usePluginData } from "@docusaurus/useGlobalData";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../ui/accordion";
import { ConfigurationPageData } from "@site/src/types/cfi";
import { Release } from "@site/src/types/ccc";

export default function CFIConfiguration({ pageData }: { pageData: ConfigurationPageData }): React.ReactElement {
  const cccData = usePluginData("ccc-pages");
  const cccReleases = cccData["ccc-releases"] as Release[];

  const matchingCCCReleases = cccReleases.filter((release) => pageData.configuration.ccc_references.includes(release.metadata.id));

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
                <div>
                  <label className="text-sm font-medium text-muted-foreground">URL</label>
                  <div className="mt-1">
                    <Link to={pageData.configuration.cfi_details.url} className="text-blue-600 hover:text-blue-800 hover:underline">
                      {pageData.configuration.cfi_details.url}
                    </Link>
                  </div>
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
                  <TableRow key={release.metadata.release_details[0].version}>
                    <TableCell>
                      <Link to={release.slug} className="text-blue-600 hover:text-blue-800 hover:underline">
                        <code className="text-sm bg-muted px-1 py-0.5 rounded">{release.slug}</code>
                      </Link>
                    </TableCell>
                    <TableCell>{release.metadata.release_details[0].version}</TableCell>
                    <TableCell>
                      <User name={release.metadata.release_details[0].release_manager.name} githubId={release.metadata.release_details[0].release_manager.github_id} company={release.metadata.release_details[0].release_manager.company} avatarUrl={`https://github.com/${release.metadata.release_details[0].release_manager.github_id}.png`} />
                    </TableCell>
                    <TableCell>{release.metadata.release_details[0].contributors.length}</TableCell>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Result</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.configuration.test_results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>
                      <Link to={result.slug} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {result.id}
                      </Link>
                    </TableCell>
                    <TableCell>{result.date}</TableCell>
                    <TableCell>{result.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Accordion type="single" collapsible>
              <AccordionItem value="terraform">
                <AccordionTrigger>View Terraform Configuration</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Source</h3>
                      <pre className="bg-muted p-4 rounded-md overflow-auto">{pageData.configuration.terraform.source}</pre>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-2">Example Usage</h3>
                      <pre className="bg-muted p-4 rounded-md overflow-auto">{pageData.configuration.terraform.script}</pre>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
