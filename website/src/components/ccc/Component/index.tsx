import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { User } from "../User";
import { ComponentPageData } from "@site/src/types/ccc";

export default function CCCComponentTemplate({ pageData }: { pageData: ComponentPageData }) {
  const { component } = pageData;
  const latestRelease = component.releases[0]; // Releases are sorted by version, so first is latest

  return (
    <Layout title={component.title}>
      <Card>
        <CardHeader>
          <CardTitle>Releases for {component.title}</CardTitle>
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
                <TableHead>Capabilities</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {component.releases.map((release) => (
                <TableRow key={release.metadata.version}>
                  <TableCell>
                    <Link to={`/ccc/${release.metadata.id}/${release.metadata.version}`} className="text-blue-600  hover:text-blue-800 hover:underline">
                      {release.metadata.version}
                    </Link>
                  </TableCell>
                  <TableCell>{release.metadata.release_details?.[0]?.["release-manager"] && release.metadata.release_details[0]["release-manager"].name ? <User contributor={release.metadata.release_details[0]["release-manager"]} /> : <span>N/A</span>}</TableCell>
                  <TableCell>
                    <div className="space-y-2">{release.metadata.release_details?.[0]?.contributors?.length > 0 ? release.metadata.release_details[0].contributors.map((contributor, index) => <User key={index} contributor={contributor} />) : <span>N/A</span>}</div>
                  </TableCell>
                  <TableCell>{release.controls.length}</TableCell>
                  <TableCell>{release.threats.length}</TableCell>
                  <TableCell>{release.capabilities.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Layout>
  );
}
