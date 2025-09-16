import React from "react";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import Link from "@docusaurus/Link";
import { Badge } from "../../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { ThreatPageData } from "@site/src/types/ccc";
import { MappingCountBadge } from "../MappingCountBadge";

export default function CCCThreatTemplate({ pageData }: { pageData: ThreatPageData }) {
  const { releaseSlug, threat, releaseTitle, related_capabilities, related_controls } = pageData;

  return (
    <Layout title={`${threat.id} - ${threat.title}`}>
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
          </div>
        </CardContent>
      </Card>

      {/* Related Capabilities Table */}
      {related_capabilities && related_capabilities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Related Capabilities</CardTitle>
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
                {related_capabilities.map((capability) => (
                  <TableRow key={capability.id}>
                    <TableCell>
                      <Link to={`${releaseSlug}/${capability.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {capability.id}
                      </Link>
                    </TableCell>
                    <TableCell>{capability.title}</TableCell>
                    <TableCell>{capability.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* External Mappings Table */}
      {threat["external-mappings"] && threat["external-mappings"].length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>External Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference ID</TableHead>
                  <TableHead>Entry ID</TableHead>
                  <TableHead>Strength</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {threat["external-mappings"].map((mapping, mappingIndex) =>
                  mapping.entries?.map((entry, entryIndex) => (
                    <TableRow key={`${mappingIndex}-${entryIndex}`}>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 font-medium border border-blue-300">
                          {mapping["reference-id"]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {mapping["reference-id"] === "MITRE-ATT&CK" ? (
                          <a href={`https://attack.mitre.org/techniques/${entry["reference-id"]}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">
                            {entry["reference-id"]}
                          </a>
                        ) : (
                          entry["reference-id"]
                        )}
                      </TableCell>
                      <TableCell>
                        <MappingCountBadge count={entry.strength || 0} />
                      </TableCell>
                      <TableCell>{entry.remarks || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Related Controls Table */}
      {related_controls && related_controls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mitigating Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Objective</TableHead>
                  <TableHead>Control Family</TableHead>
                  <TableHead>Threat Mappings</TableHead>
                  <TableHead>Guideline Mappings</TableHead>
                  <TableHead>Assessment Requirements</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {related_controls.map((control) => (
                  <TableRow key={control.id}>
                    <TableCell>
                      <Link to={`${releaseSlug}/${control.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {control.id}
                      </Link>
                    </TableCell>
                    <TableCell>{control.title}</TableCell>
                    <TableCell>{control.objective}</TableCell>
                    <TableCell>{control.family.title}</TableCell>
                    <TableCell>
                      <MappingCountBadge count={control.threat_mappings?.length || 0} />
                    </TableCell>
                    <TableCell>
                      <MappingCountBadge count={control.guideline_mappings?.length || 0} />
                    </TableCell>
                    <TableCell>
                      <MappingCountBadge count={control.test_requirements?.length || 0} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
}
