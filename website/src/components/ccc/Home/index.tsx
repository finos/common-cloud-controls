import React from "react";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import Link from "@docusaurus/Link";
import { HomePageData } from "@site/src/types/ccc";
import { User } from "../User";

export default function CCCHomeTemplate({ pageData }: { pageData: HomePageData }) {
  const { components } = pageData;

  // Flatten all releases into a single array with component title
  const allReleases = components.flatMap((component) =>
    component.releases.map((release) => ({
      ...release,
      componentTitle: component.title,
      slug: `/ccc/${release.metadata.id}/${release.metadata.version}`,
    }))
  );
  // Transform components into a summary list
  const componentSummaries = components.map((component) => {
    const allDetails = component.releases.flatMap((r) => r.metadata.release_details || []);
    const latestRelease =
      allDetails.length > 0
        ? allDetails.reduce((latest, current) => {
            return current.version > latest.version ? current : latest;
          }, allDetails[0])
        : { version: component.releases[0]?.metadata.version || "N/A" };

    return {
      id: component.releases[0].metadata.id,
      title: component.title,
      numberOfReleases: component.releases.length,
      latestVersion: latestRelease.version,
      slug: `/ccc/${component.id}`,
    };
  });

  return (
    <Layout title="Common Cloud Controls">
      <main className="container margin-vert--lg space-y-8">
        <div className="text-center">
          <h1>Common Cloud Controls</h1>
          <p className="text-xl text-muted-foreground">All Releases</p>
        </div>
        {/* <pre>{JSON.stringify(components, null, 2)}</pre> */}
        {/* {components.map((category) =>
          category.releases.map((release) =>
            release.controls.map((control) => (
              <div key={control.id}>
                <pre>{JSON.stringify(control.control_mappings, null, 2)}</pre>
              </div>
            ))
          )
        )} */}
        <Card>
          <CardHeader>
            <CardTitle>Components Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component Title</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Number of Releases</TableHead>
                  <TableHead>Latest Version</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {componentSummaries.map((comp) => (
                  <TableRow key={comp.id}>
                    <TableCell>
                      <Link to={comp.slug} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {comp.title}
                      </Link>
                    </TableCell>
                    <TableCell>{comp.id}</TableCell>
                    <TableCell>{comp.numberOfReleases}</TableCell>
                    <TableCell>{comp.latestVersion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Releases</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Release Manager</TableHead>
                  <TableHead>Authors</TableHead>
                  <TableHead>Controls</TableHead>
                  <TableHead>Threats</TableHead>
                  <TableHead>Capabilities</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allReleases.map((release) => (
                  <TableRow key={release.metadata.id}>
                    <TableCell>{release.componentTitle}</TableCell>
                    {/* <TableCell>
                      <Link to={release.slug} className="text-blue-600 underline hover:text-blue-800">
                        {release.slug}
                      </Link>
                    </TableCell> */}
                    <TableCell>
                      <Link to={release.slug} className="text-blue-600  hover:text-blue-800 hover:underline">
                        {release.metadata.version}
                      </Link>
                    </TableCell>
                    <TableCell>{release.metadata.release_details?.[0]?.["release-manager"] ? <User name={release.metadata.release_details[0]["release-manager"].name} githubId={release.metadata.release_details[0]["release-manager"]["github-id"]} company={release.metadata.release_details[0]["release-manager"].company} avatarUrl={`https://github.com/${release.metadata.release_details[0]["release-manager"]["github-id"]}.png`} /> : <span>N/A</span>}</TableCell>
                    <TableCell>{release.metadata.release_details?.[0]?.contributors?.length || 0}</TableCell>
                    <TableCell>{release.controls.length}</TableCell>
                    <TableCell>{release.threats.length}</TableCell>
                    <TableCell>{release.capabilities.length}</TableCell>
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
