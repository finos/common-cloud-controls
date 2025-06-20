import React from "react";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import Link from "@docusaurus/Link";
import { Configuration, HomePageData } from "@site/src/types/cfi";

function groupByCCCReference(configurations: Configuration[]): Map<string, Configuration[]> {
  const map = new Map<string, Configuration[]>();
  configurations.forEach((configuration) => {
    configuration.ccc_references.forEach((cccReference) => {
      if (!map.has(cccReference)) {
        map.set(cccReference, []);
      }

      map.get(cccReference)!.push(configuration);
    });
  });
  return map;
}

export default function CFIHomeTemplate({ pageData }: { pageData: HomePageData }) {
  const { configurations } = pageData;
  const groupedConfigurations = groupByCCCReference(configurations);
  console.log(groupedConfigurations);

  return (
    <Layout title="Cloud Financial Infrastructure">
      <main className="container margin-vert--lg space-y-8">
        <div className="text-center">
          <h1>Cloud Financial Infrastructure</h1>
          <p className="text-xl text-muted-foreground">Implementation of Common Cloud Controls in Infrastructure as Code</p>
        </div>

        {Array.from(groupedConfigurations.keys()).map((id) => (
          <Card key={id}>
            <CardHeader>
              <CardTitle>{id}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Results</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedConfigurations.get(id).map((c: Configuration) => (
                    <TableRow key={c.cfi_details.id}>
                      <TableCell>
                        <Link to={c.slug} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {c.cfi_details.id}
                        </Link>
                      </TableCell>
                      <TableCell>{c.cfi_details.name}</TableCell>
                      <TableCell>{c.cfi_details.provider}</TableCell>
                      <TableCell>{c.cfi_details.description}</TableCell>
                      <TableCell>{c.test_results.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </main>
    </Layout>
  );
}
