import React from "react";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import Link from "@docusaurus/Link";
import { User } from "../User";

export interface Release {
  id: string;
  title: string;
  slug: string;
  version: string;
  release_manager: {
    name: string;
    githubId: string;
    company: string;
    avatarUrl?: string;
  };
  authors: string[];
  controls_count: number;
  threats_count: number;
  features_count: number;
  link: string;
}

export interface Component {
  title: string;
  releases: Release[];
}

interface HomePageData {
  components: Component[];
}

export default function CCCHomeTemplate({ pageData }: { pageData: HomePageData }) {
  const { components } = pageData;

  return (
    <Layout title="Common Cloud Controls">
      <main className="container margin-vert--lg space-y-8">
        <div className="text-center">
          <h1>Common Cloud Controls</h1>
          <p className="text-xl text-muted-foreground">Releases by Component</p>
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
                    <TableHead>Slug</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Release Manager</TableHead>
                    <TableHead>Authors</TableHead>
                    <TableHead>Controls</TableHead>
                    <TableHead>Threats</TableHead>
                    <TableHead>Features</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {component.releases.map((release) => (
                    <TableRow key={release.id}>
                      <TableCell>
                        <Link to={release.link} className="text-primary hover:underline">
                          <code className="text-sm bg-muted px-1 py-0.5 rounded">{release.slug}</code>
                        </Link>
                      </TableCell>
                      <TableCell>{release.version}</TableCell>
                      <TableCell>
                        <User name={release.release_manager.name} githubId={release.release_manager.githubId} company={release.release_manager.company} avatarUrl={`https://github.com/${release.release_manager.githubId}.png`} />
                      </TableCell>
                      <TableCell>{release.authors.length}</TableCell>
                      <TableCell>{release.controls_count}</TableCell>
                      <TableCell>{release.threats_count}</TableCell>
                      <TableCell>{release.features_count}</TableCell>
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
