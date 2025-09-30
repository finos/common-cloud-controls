import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { User } from "../User";
import { MappingCountBadge } from "../MappingCountBadge";
import { ThreatsTable } from "../ThreatsTable";
import { ControlsTable } from "../ControlsTable";
import { ReleasePageData } from "@site/src/types/ccc";

export default function CCCReleaseTemplate({ pageData }: { pageData: ReleasePageData }) {
  const { metadata, controls, capabilities, threats } = pageData.release;
  const release = metadata.release_details?.[0];

  return (
    <Layout title={metadata.title}>
      <main className="container margin-vert--lg space-y-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link to="/ccc" className="hover:text-foreground">
            Common Cloud Controls
          </Link>
          <span>/</span>
          <Link to={`/ccc/${metadata.id}`} className="hover:text-foreground">
            {metadata.title}
          </Link>
          <span>/</span>
          <span className="text-foreground">{metadata.version}</span>
        </nav>

        <Card>
          <CardHeader>
            <CardTitle>{metadata.title}</CardTitle>
            <p className="text-muted-foreground">{metadata.description}</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Release Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Version:</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 font-medium border border-blue-300">
                  {release?.version === "DEV" ? metadata.version : release?.version}
                </Badge>
                {release?.version !== "DEV" && (
                  <a href={`https://github.com/finos/common-cloud-controls/releases/tag/${metadata.id}-${release?.version === "DEV" ? metadata.version : release?.version}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    View on GitHub
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Assurance Level:</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 font-medium border border-blue-300">
                  {release?.["assurance-level"]}
                </Badge>
              </div>
              <div className="space-y-2">
                <span className="font-medium">Release Manager:</span>
                {release?.["release-manager"] && release["release-manager"].name && <User contributor={release["release-manager"]} />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {release?.contributors?.map((contributor, index) => (
                <User key={index} contributor={contributor} />
              ))}
            </div>
          </CardContent>
        </Card>

        {release?.["change-log"] && (
          <Card>
            <CardHeader>
              <CardTitle>Change Log</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-4 space-y-1">
                {release["change-log"].map((log, idx) => (
                  <li key={idx}>{log}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Capabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Threat Mappings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {capabilities.map((capability) => (
                  <TableRow key={capability.id}>
                    <TableCell>
                      <Link to={`${pageData.slug}/${capability.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {capability.id}
                      </Link>
                    </TableCell>
                    <TableCell>{capability.title}</TableCell>
                    <TableCell>{capability.description}</TableCell>
                    <TableCell>
                      <MappingCountBadge count={threats.filter((threat) => threat.capabilities?.some((cap) => cap.entries?.some((entry) => entry["reference-id"] === capability.id))).length} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <ThreatsTable threats={threats} releaseSlug={pageData.slug} />

        <ControlsTable controls={controls} releaseSlug={pageData.slug} />
      </main>
    </Layout>
  );
}
