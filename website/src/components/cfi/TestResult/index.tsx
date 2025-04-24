import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";

export enum TestResultType {
  PASS = "pass",
  FAIL = "fail",
  NA = "na",
  ERROR = "error",
}

export interface TestResultItem {
  test_requirement_id: string;
  test_id: string;
  result: TestResultType;
  description: string;
}

interface TestResultPageData {
  slug: string;
  result_name: string;
  result_path: string;
  releaseTitle: string;
  ccc_reference: {
    version: string;
    id: string;
  };
  test_results: TestResultItem[];
}

const resultTypeToBadgeVariant = {
  [TestResultType.PASS]: "default",
  [TestResultType.FAIL]: "destructive",
  [TestResultType.NA]: "secondary",
  [TestResultType.ERROR]: "destructive",
} as const;

export default function CFITestResult({ pageData }: { pageData: TestResultPageData }): React.ReactElement {
  return (
    <Layout title={`Test Result - ${pageData.result_name}`} description={`Test results for ${pageData.releaseTitle}`}>
      <main className="container margin-vert--lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Results: {pageData.result_name}</CardTitle>
            <p className="text-muted-foreground">
              For <Link to={`/cfi/${pageData.slug}`}>{pageData.releaseTitle}</Link>
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CCC Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to={`/ccc/${pageData.ccc_reference.id}`} className="text-primary hover:underline">
              {pageData.ccc_reference.id} (v{pageData.ccc_reference.version})
            </Link>
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
                  <TableHead>Test Requirement ID</TableHead>
                  <TableHead>Test ID</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.test_results.map((result, index) => (
                  <TableRow key={`${result.test_requirement_id}-${index}`}>
                    <TableCell>{result.test_requirement_id}</TableCell>
                    <TableCell>{result.test_id}</TableCell>
                    <TableCell>
                      <Badge variant={resultTypeToBadgeVariant[result.result]}>{result.result}</Badge>
                    </TableCell>
                    <TableCell>{result.description}</TableCell>
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
