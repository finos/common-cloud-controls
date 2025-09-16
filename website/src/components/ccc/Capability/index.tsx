import React from "react";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import Link from "@docusaurus/Link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { CapabilityPageData } from "@site/src/types/ccc";
import { MappingCountBadge } from "../MappingCountBadge";

export default function CCCCapabilityTemplate({ pageData }: { pageData: CapabilityPageData }) {
  const { releaseSlug, capability, related_threats } = pageData;

  return (
    <Layout title={`${capability.id} - ${capability.title}`}>
      <Card>
        <CardHeader>
          <CardTitle>
            {capability.id}: {capability.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Capability ID:</span>
              <span>{capability.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Title:</span>
              <span>{capability.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Description:</span>
              <span>{capability.description}</span>
            </div>
          </div>

          {related_threats && related_threats.length > 0 && (
            <div className="space-y-2">
              <span className="font-medium">Mapped Threats:</span>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>External Mappings</TableHead>
                    <TableHead>Capability Mappings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {related_threats.map((threat) => (
                    <TableRow key={threat.id}>
                      <TableCell>
                        <Link to={`${releaseSlug}/${threat.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {threat.id}
                        </Link>
                      </TableCell>
                      <TableCell>{threat.title}</TableCell>
                      <TableCell>{threat.description}</TableCell>
                      <TableCell>
                        <MappingCountBadge count={threat["external-mappings"]?.length || 0} />
                      </TableCell>
                      <TableCell>
                        <MappingCountBadge count={threat.capabilities?.length || 0} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
