import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import Link from "@docusaurus/Link";
import { MappingCountBadge } from "../MappingCountBadge";
import { Threat } from "@site/src/types/ccc";

interface ThreatsTableProps {
  threats: Threat[];
  releaseSlug: string;
  title?: string;
}

export function ThreatsTable({ threats, releaseSlug, title = "Threats" }: ThreatsTableProps) {
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {threats.map((threat) => (
              <TableRow key={threat.id}>
                <TableCell>
                  {(() => {
                    // Check if this is a cross-catalog reference (e.g., CCC.Core.* referenced from another catalog)
                    const threatCatalog = threat.id.split(".").slice(0, 2).join(".");
                    const currentCatalog = releaseSlug.split("/")[2]; // Extract catalog from /ccc/CCC.AuditLog/DEV

                    if (threatCatalog === currentCatalog) {
                      // Same catalog - create a link
                      return (
                        <Link to={`${releaseSlug}/${threat.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {threat.id}
                        </Link>
                      );
                    } else {
                      // Cross-catalog reference - just show as text
                      return <span className="font-mono">{threat.id}</span>;
                    }
                  })()}
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
      </CardContent>
    </Card>
  );
}
