import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import Link from "@docusaurus/Link";
import { MappingCountBadge } from "../MappingCountBadge";
import { Threat, Control } from "@site/src/types/ccc";

interface ThreatsTableProps {
  threats: Threat[];
  releaseSlug: string;
  title?: string;
  controls?: Control[]; // Optional controls array to count control mappings
}

export function ThreatsTable({ threats, releaseSlug, title = "Threats", controls }: ThreatsTableProps) {
  if (!threats || threats.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>External Mappings</TableHead>
              <TableHead>Capability Mappings</TableHead>
              <TableHead>Control Mappings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {threats.map((threat) => (
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
                <TableCell>
                  <MappingCountBadge count={controls ? controls.filter((control) => control.threat_mappings?.find((mapping) => mapping["reference-id"] === "CCC")?.entries?.some((entry) => entry["reference-id"] === threat.id)).length : 0} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
