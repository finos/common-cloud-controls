import React from "react";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import Link from "@docusaurus/Link";
import { Badge } from "../../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { FeaturePageData } from "@site/src/types/ccc";

export default function CCCFeatureTemplate({ pageData }: { pageData: FeaturePageData }) {
  const { releaseSlug, feature, releaseTitle } = pageData;

  return (
    <Layout title={`${feature.id} - ${feature.title}`}>
      <main className="container margin-vert--lg space-y-6">
        <Link to={releaseSlug} className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
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

            {feature.related_threats && feature.related_threats.length > 0 && (
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
                    {feature.related_threats.map((threat) => (
                      <TableRow key={threat.id}>
                        <TableCell>
                          <Link to={threat.slug} className="text-blue-600 hover:text-blue-800 hover:underline">
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
