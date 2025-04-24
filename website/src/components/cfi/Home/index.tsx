import React from "react";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import Link from "@docusaurus/Link";
import { User } from "../../ccc/User";

interface Release {
  id: string;
  title: string;
  slug: string;
  version: string;
  description: string;
  url: string;
  authors: Array<{
    name: string;
    githubId: string;
    company: string;
  }>;
  ccc_reference: {
    version: string;
    id: string;
    link: string;
  };
  terraform: {
    source: string;
    script: string;
  };
  test_results: Array<{
    path: string;
    name: string;
  }>;
  link: string;
}

interface Component {
  title: string;
  releases: Release[];
}

interface HomePageData {
  components: Component[];
}

export default function CFIHomeTemplate({ pageData }: { pageData: HomePageData }) {
  const { components } = pageData;

  return (
    <Layout title="Cloud Financial Infrastructure">
      <main className="container margin-vert--lg space-y-8">
        <div className="text-center">
          <h1>Cloud Financial Infrastructure</h1>
          <p className="text-xl text-muted-foreground">Implementation of Common Cloud Controls in Infrastructure as Code</p>
        </div>

        {components.map((component) => (
          <Card key={component.title}>
            <CardHeader>
              <CardTitle>{component.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Tests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {component.releases.map((release) => (
                    <TableRow key={release.id}>
                      <TableCell>
                        <Link to={release.link} className="text-primary hover:underline">
                          {release.title}
                        </Link>
                      </TableCell>
                      <TableCell>{release.description}</TableCell>
                      <TableCell>
                        <a href={release.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {release.url}
                        </a>
                      </TableCell>
                      <TableCell>{release.test_results.length}</TableCell>
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
