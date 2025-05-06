import React from "react";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import Link from "@docusaurus/Link";
import { Badge } from "../../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { ThreatPageData } from "@site/src/types/ccc";

export default function CCCThreatTemplate({ pageData }: { pageData: ThreatPageData }) {
  const { releaseSlug, threat, releaseTitle } = pageData;

  return (
    <Layout title={`${threat.id} - ${threat.title}`}>
      <main className="container margin-vert--lg space-y-6">
        <Link to={releaseSlug} className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
          ← Back to {releaseTitle}
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>
              {threat.id}: {threat.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Threat ID:</span>
                <span className="font-mono">{threat.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Title:</span>
                <span>{threat.title}</span>
              </div>
              <div className="space-y-2">
                <span className="font-medium">Description:</span>
                <p className="text-muted-foreground">{threat.description}</p>
              </div>

              {threat.related_features && threat.related_features.length > 0 && (
                <div className="space-y-2">
                  <span className="font-medium">Related Features:</span>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {threat.related_features.map((feature) => (
                        <TableRow key={feature.id}>
                          <TableCell>
                            <Link to={feature.slug} className="text-blue-600 hover:text-blue-800 hover:underline">
                              {feature.id}
                            </Link>
                          </TableCell>
                          <TableCell>{feature.title}</TableCell>
                          <TableCell>{feature.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {threat.mitre_technique && threat.mitre_technique.length > 0 && (
                <div className="space-y-2">
                  <span className="font-medium">MITRE ATT&CK Techniques:</span>
                  <div className="flex flex-wrap gap-2 ">
                    {threat.mitre_technique.map((technique) => (
                      <a key={technique} href={`https://attack.mitre.org/techniques/${technique}`} target="_blank" rel="noopener noreferrer">
                        <Badge variant="outline" className="bg-blue-100 text-blue-600 font-medium border border-blue-300 hover:bg-blue-300 hover:border-blue-400 hover:text-blue-900">
                          {technique}
                        </Badge>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {threat.related_controls && threat.related_controls.length > 0 && (
                <div className="space-y-2">
                  <span className="font-medium">Related Controls:</span>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Title</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {threat.related_controls.map((control) => (
                        <TableRow key={control.id}>
                          <TableCell>
                            <Link to={control.slug} className="text-blue-600 hover:text-blue-800 hover:underline">
                              {control.id}
                            </Link>
                          </TableCell>
                          <TableCell>{control.title}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
