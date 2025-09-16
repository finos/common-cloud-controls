import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { User } from "../User";
import { ComponentPageData } from "@site/src/types/ccc";

export default function CCCReleaseTemplate({ pageData }: { pageData: ComponentPageData }) {
  const { metadata } = pageData.component.releases[0];

  return (
    <Layout title={metadata.title}>
      <main className="container margin-vert--lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{metadata.title}</CardTitle>
            <p className="text-muted-foreground">{metadata.description}</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Release Manager</TableHead>
                  <TableHead>Authors</TableHead>
                  <TableHead>Controls</TableHead>
                  <TableHead>Threats</TableHead>
                  <TableHead>Features</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.component.releases.map((release) => (
                  <TableRow key={release.metadata.id}>
                    <TableCell>
                      <Link to={release.slug} className="text-blue-600  hover:text-blue-800 hover:underline">
                        {release.metadata.version}
                      </Link>
                    </TableCell>
                    <TableCell>{release.metadata.release_details?.[0]?.release_manager ? <User name={release.metadata.release_details[0].release_manager.name} githubId={release.metadata.release_details[0].release_manager.github_id} company={release.metadata.release_details[0].release_manager.company} avatarUrl={`https://github.com/${release.metadata.release_details[0].release_manager.github_id}.png`} /> : <span>N/A</span>}</TableCell>
                    <TableCell>{release.metadata.release_details?.[0]?.contributors?.length || 0}</TableCell>
                    <TableCell>{release.controls.length}</TableCell>
                    <TableCell>{release.threats.length}</TableCell>
                    <TableCell>{release.features.length}</TableCell>
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
