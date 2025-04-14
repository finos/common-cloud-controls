import React from "react";
import Layout from "@theme/Layout";
import { Control } from "../Control";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { User } from "../User";

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

interface Feature {
  id: string;
  title: string;
  description: string;
  link: string;
}

interface Threat {
  id: string;
  title: string;
  description: string;
  features: string[];
  mitre_technique: string[];
  link: string;
}

interface CCCPageData {
  slug: string;
  metadata: Metadata;
  controls: Control[];
  features: Feature[];
  threats: Threat[];
}

export default function CCCReleaseTemplate({ pageData }: { pageData: CCCPageData }) {
  const { slug, metadata, controls, features, threats } = pageData;
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
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Version:</span>
                <Badge variant="secondary">{release?.version}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Assurance Level:</span>
                <Badge variant="outline">{release?.assurance_level}</Badge>
              </div>
              <div className="space-y-2">
                <span className="font-medium">Release Manager:</span>
                {release?.release_manager && <User name={release.release_manager.name} githubId={release.release_manager.github_id} company={release.release_manager.company} avatarUrl={`https://github.com/${release.release_manager.github_id}.png`} />}
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
              {release?.contributors?.map((contributor) => (
                <User key={contributor.github_id} name={contributor.name} githubId={contributor.github_id} company={contributor.company} avatarUrl={`https://github.com/${contributor.github_id}.png`} />
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
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {features.map((feature) => (
                  <TableRow key={feature.id}>
                    <TableCell>
                      <Link to={`/ccc/${slug}/${feature.link}`} className="text-primary hover:underline">
                        {feature.id}
                      </Link>
                    </TableCell>
                    <TableCell>{feature.title}</TableCell>
                    <TableCell>{feature.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Threats</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>MITRE ATT&CK</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {threats.map((threat) => (
                  <TableRow key={threat.id}>
                    <TableCell>
                      <Link to={`/ccc/${slug}/${threat.link}`} className="text-primary hover:underline">
                        {threat.id}
                      </Link>
                    </TableCell>
                    <TableCell>{threat.title}</TableCell>
                    <TableCell>{threat.description}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {threat.mitre_technique?.map((technique) => (
                          <a key={technique} href={`https://attack.mitre.org/techniques/${technique}`} target="_blank" rel="noopener noreferrer" className="text-xs">
                            {technique}
                          </a>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
