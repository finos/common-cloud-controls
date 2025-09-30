import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { ControlPageData } from "@site/src/types/ccc";
import { ThreatsTable } from "../ThreatsTable";
import { CapabilitiesTable } from "../CapabilitiesTable";
import { ExternalMappingsTable } from "../ExternalMappingsTable";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";

export default function CCCControlTemplate({ pageData }: { pageData: ControlPageData }) {
  const { control, releaseTitle, releaseSlug, related_threats, related_capabilities } = pageData;

  return (
    <Layout title={control.title}>
      <Card>
        <CardHeader>
          <CardTitle>
            {control.id}: {control.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-[120px_1fr] gap-4 items-start">
              <span className="font-medium text-muted-foreground">Control ID:</span>
              <span className="font-mono font-medium">{control.id}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-4 items-start">
              <span className="font-medium text-muted-foreground">Title:</span>
              <span>{control.title}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-4 items-start">
              <span className="font-medium text-muted-foreground">Objective:</span>
              <span className="text-sm leading-relaxed">{control.objective}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
              <span className="font-medium text-muted-foreground">Control Family:</span>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 font-medium border border-blue-300 w-fit">
                {control.family.title}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <ThreatsTable threats={related_threats || []} releaseSlug={releaseSlug} title="Related Threats" />

      <CapabilitiesTable capabilities={related_capabilities || []} releaseSlug={releaseSlug} title="Related Capabilities" />

      <ExternalMappingsTable mappings={control.guideline_mappings || []} title="Guideline Mappings" />

      {control.test_requirements?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Applicability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {control.test_requirements.map((tr) => (
                  <TableRow key={tr.id} id={tr.id}>
                    <TableCell className="font-mono font-medium">{tr.id}</TableCell>
                    <TableCell className="max-w-md">{tr.text}</TableCell>
                    <TableCell>
                      {tr.applicability?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {tr.applicability.map((level) => (
                            <Badge key={level} variant="outline" className="bg-blue-100 text-blue-800 font-medium border border-blue-300 text-xs">
                              {level}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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
