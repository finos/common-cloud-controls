import React from "react";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import Link from "@docusaurus/Link";
import { Configuration, HomePageData } from "@site/src/types/cfi";

export default function CFIHomeTemplate({ pageData }: { pageData: HomePageData }) {
  const { configurations } = pageData;

  // Sort configurations by provider then by name
  const sortedConfigurations = [...configurations].sort((a, b) => {
    if (a.cfi_details.provider !== b.cfi_details.provider) {
      return a.cfi_details.provider.localeCompare(b.cfi_details.provider);
    }
    return a.cfi_details.name.localeCompare(b.cfi_details.name);
  });

  return (
    <Layout title="Cloud Financial Infrastructure">
      <main className="container margin-vert--lg space-y-8">
        <div className="text-center">
          <h1>Cloud Financial Infrastructure</h1>
          <p className="text-xl text-muted-foreground">Implementation of Common Cloud Controls in Infrastructure as Code</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>CFI Configurations</CardTitle>
            <p className="text-sm text-muted-foreground">Available CFI configurations across different cloud providers and services</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>GitHub Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedConfigurations.map((config) => (
                    <TableRow key={config.cfi_details.id}>
                      <TableCell className="font-medium">
                        <Link to={config.slug} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {config.cfi_details.id}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 uppercase">{config.cfi_details.provider}</span>
                      </TableCell>
                      <TableCell className="font-medium">{config.cfi_details.name}</TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate" title={config.cfi_details.description}>
                          {config.cfi_details.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        {config.cfi_details.git && (
                          <a href={config.cfi_details.git} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline text-sm flex items-center gap-1">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            View GitHub
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {sortedConfigurations.length === 0 && <div className="text-center py-8 text-gray-500">No CFI configurations found. Please check that configuration files exist in the test-results directory.</div>}
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
