import React from "react";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import Link from "@docusaurus/Link";
import { Configuration, HomePageData, CFIResultSummary } from "@site/src/types/cfi";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(passingTests: number, failingTests: number, totalTests: number) {
  if (totalTests === 0) {
    return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">No Tests</span>;
  }

  if (failingTests === 0) {
    return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">All Passing</span>;
  }

  if (passingTests === 0) {
    return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">All Failing</span>;
  }

  return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Mixed Results</span>;
}

export default function CFIHomeTemplate({ pageData }: { pageData: HomePageData }) {
  const { resultsSummary } = pageData;

  // Sort results by date (newest first)
  const sortedResults = [...resultsSummary].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Layout title="Cloud Financial Infrastructure">
      <main className="container margin-vert--lg space-y-8">
        <div className="text-center">
          <h1>Cloud Financial Infrastructure</h1>
          <p className="text-xl text-muted-foreground">Implementation of Common Cloud Controls in Infrastructure as Code</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>CFI Test Results Summary</CardTitle>
            <p className="text-sm text-muted-foreground">Comprehensive view of all CFI test results across different configurations and providers</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Test Results</TableHead>
                    <TableHead>Date Collected</TableHead>
                    <TableHead>Repository</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedResults.map((result, index) => (
                    <TableRow key={`${result.name}-${result.date}-${index}`}>
                      <TableCell className="font-medium">
                        <Link to={result.configurationSlug} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {result.name}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate" title={result.description}>
                          {result.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 uppercase">{result.provider}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex gap-2">
                            <span className="text-green-600 font-medium">{result.passingTests} passing</span>
                            <span className="text-red-600 font-medium">{result.failingTests} failing</span>
                          </div>
                          <div className="text-xs text-gray-500">{result.totalTests} total tests</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(result.date)}</TableCell>
                      <TableCell>
                        <a href={result.repositoryUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline text-sm">
                          View Repository
                        </a>
                      </TableCell>
                      <TableCell>{getStatusBadge(result.passingTests, result.failingTests, result.totalTests)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {sortedResults.length === 0 && <div className="text-center py-8 text-gray-500">No CFI test results found. Please run the download script to fetch results.</div>}
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
