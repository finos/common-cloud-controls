import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import Link from "@docusaurus/Link";
import { Capability } from "@site/src/types/ccc";

interface CapabilitiesTableProps {
  capabilities: Capability[];
  releaseSlug: string;
  title?: string;
}

export function CapabilitiesTable({ capabilities, releaseSlug, title = "Related Capabilities" }: CapabilitiesTableProps) {
  if (!capabilities || capabilities.length === 0) {
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {capabilities.map((capability) => (
              <TableRow key={capability.id}>
                <TableCell>
                  {(() => {
                    // Check if this is a cross-catalog reference (e.g., CCC.Core.* referenced from another catalog)
                    const capabilityCatalog = capability.id.split(".").slice(0, 2).join(".");
                    const currentCatalog = releaseSlug.split("/")[2]; // Extract catalog from /ccc/CCC.AuditLog/DEV

                    if (capabilityCatalog === currentCatalog) {
                      // Same catalog - create a link
                      return (
                        <Link to={`${releaseSlug}/${capability.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {capability.id}
                        </Link>
                      );
                    } else {
                      // Cross-catalog reference - just show as text
                      return <span className="font-mono">{capability.id}</span>;
                    }
                  })()}
                </TableCell>
                <TableCell>{capability.title}</TableCell>
                <TableCell>{capability.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
