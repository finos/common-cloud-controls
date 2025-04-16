import React from "react";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import Link from "@docusaurus/Link";
import { Badge } from "../../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";

export interface Feature {
  id: string;
  title: string;
  description: string;
  link: string;
  relatedControls?: {
    id: string;
    title: string;
    link: string;
  }[];
  relatedThreats?: {
    id: string;
    title: string;
    description: string;
    link: string;
  }[];
}

interface FeaturePageData {
  slug: string;
  feature: Feature;
  releaseTitle: string;
  releaseId: string;
}

export default function CCCFeatureTemplate({ pageData }: { pageData: FeaturePageData }) {
  const { slug, feature, releaseTitle } = pageData;

  return (
    <Layout title={`${feature.id} - ${feature.title}`}>
      <main className="container margin-vert--lg space-y-6">
        <Link to={`/ccc/${slug}`} className="text-primary hover:underline flex items-center gap-1">
          ← Back to {releaseTitle}
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>
              {feature.id}: {feature.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Description:</span>
                <span>{feature.description}</span>
              </div>
            </div>

            {feature.relatedControls && feature.relatedControls.length > 0 && (
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
                    {feature.relatedControls.map((control) => (
                      <TableRow key={control.id}>
                        <TableCell>
                          <Link to={`/ccc/${slug}/${control.id}`} className="text-primary hover:underline">
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

            {feature.relatedThreats && feature.relatedThreats.length > 0 && (
              <div className="space-y-2">
                <span className="font-medium">Related Threats:</span>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feature.relatedThreats.map((threat) => (
                      <TableRow key={threat.id}>
                        <TableCell>
                          <Link to={`/ccc/${slug}/${threat.id}`} className="text-primary hover:underline">
                            {threat.id}
                          </Link>
                        </TableCell>
                        <TableCell>{threat.title}</TableCell>
                        <TableCell>{threat.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
