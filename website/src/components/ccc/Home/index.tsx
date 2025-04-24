import React from "react";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import Link from "@docusaurus/Link";
import { HomePageData } from "@site/src/types/ccc";
import { User } from "../User";

export default function CCCHomeTemplate({ pageData }: { pageData: HomePageData }) {
  const { components } = pageData;

  console.log(JSON.stringify(pageData, null, 2));

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
                    <TableRow key={release.metadata.id}>
                      <TableCell>
                        <Link to={release.slug} className="text-primary hover:underline">
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
        ))}
      </main>
    </Layout>
  );
}
