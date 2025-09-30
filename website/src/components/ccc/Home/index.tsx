import React from "react";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import Link from "@docusaurus/Link";
import { HomePageData } from "@site/src/types/ccc";

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
    // Filter out DEV versions from release details and prefer actual release versions
    const realReleaseDetails = allDetails.filter((detail) => detail.version !== "DEV");

    let latestVersion;
    if (realReleaseDetails.length > 0) {
      // Use the latest real release version
      const latestRelease = realReleaseDetails.reduce((latest, current) => {
        return current.version > latest.version ? current : latest;
      }, realReleaseDetails[0]);
      latestVersion = latestRelease.version;
    } else {
      // Fall back to metadata version (the real version from the catalog)
      latestVersion = component.releases[0]?.metadata.version || "N/A";
    }

    return {
      id: component.releases[0].metadata.id,
      title: component.title,
      numberOfReleases: component.releases.length,
      latestVersion: latestVersion,
      slug: `/ccc/${component.id}`,
    };
  });

  return (
    <Layout title="Common Cloud Controls">
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
    </Layout>
  );
}
