import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import Link from "@docusaurus/Link";
import { MappingCountBadge } from "../MappingCountBadge";
import { Control } from "@site/src/types/ccc";

interface ControlsTableProps {
  controls: Control[];
  releaseSlug: string;
  title?: string;
}

export function ControlsTable({ controls, releaseSlug, title = "Controls" }: ControlsTableProps) {
  if (!controls || controls.length === 0) {
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
              <TableHead>Objective</TableHead>
              <TableHead>Control Family</TableHead>
              <TableHead>Threat Mappings</TableHead>
              <TableHead>Guideline Mappings</TableHead>
              <TableHead>Assessment Requirements</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {controls.map((control) => (
              <TableRow key={control.id}>
                <TableCell>
                  {(() => {
                    // Check if this is a cross-catalog reference (e.g., CCC.Core.* referenced from another catalog)
                    const controlCatalog = control.id.split(".").slice(0, 2).join(".");
                    const currentCatalog = releaseSlug.split("/")[2]; // Extract catalog from /ccc/CCC.AuditLog/DEV

                    if (controlCatalog === currentCatalog) {
                      // Same catalog - create a link
                      return (
                        <Link to={`${releaseSlug}/${control.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {control.id}
                        </Link>
                      );
                    } else {
                      // Cross-catalog reference - just show as text
                      return <span className="font-mono">{control.id}</span>;
                    }
                  })()}
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
  );
}
