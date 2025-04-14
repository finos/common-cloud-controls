import React from "react";
import Layout from "@theme/Layout";
import { Control } from "../Control";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";

interface ReleaseManager {
  name: string;
  github_id: string;
  company: string;
  summary: string;
}

interface Contributor {
  name: string;
  github_id: string;
  company: string;
}

interface ReleaseDetails {
  version: string;
  assurance_level: string | null;
  threat_model_url: string | null;
  threat_model_author: string | null;
  red_team: string | null;
  red_team_exercise_url: string | null;
  release_manager: ReleaseManager;
  change_log: string[];
  contributors: Contributor[];
}

interface Metadata {
  title: string;
  id: string;
  description: string;
  release_details: ReleaseDetails[];
}

interface CCCPageData {
  slug: string;
  metadata: Metadata;
  controls: Control[];
}

export default function CCCReleaseTemplate({ pageData }: { pageData: CCCPageData }) {
  const { slug, metadata, controls } = pageData;
  const release = metadata.release_details?.[0];

  return (
    <Layout title={metadata.title}>
      <main className="container margin-vert--lg space-y-6">
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
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Version:</span>
                <Badge variant="secondary">{release?.version}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Assurance Level:</span>
                <Badge variant="outline">{release?.assurance_level}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Release Manager:</span>
                <span>
                  {release?.release_manager?.name} ({release?.release_manager?.company})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {release?.contributors?.map((c) => (
                <div key={c.github_id} className="flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground">— {c.company}</span>
                  <a href={`https://github.com/${c.github_id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {c.github_id}
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {release?.change_log && (
          <Card>
            <CardHeader>
              <CardTitle>Change Log</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-4 space-y-1">
                {release.change_log.map((log, idx) => (
                  <li key={idx}>{log}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Objective</TableHead>
                  <TableHead>Control Family</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {controls.map((control) => (
                  <TableRow key={control.id}>
                    <TableCell>
                      <Link to={`/ccc/${slug}/${control.id}`} className="text-primary hover:underline">
                        {control.id}
                      </Link>
                    </TableCell>
                    <TableCell>{control.title}</TableCell>
                    <TableCell>{control.objective}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{control.control_family}</Badge>
                    </TableCell>
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
