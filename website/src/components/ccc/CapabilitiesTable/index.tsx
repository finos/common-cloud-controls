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

  const sortedCapabilities = [...capabilities].sort((a, b) => a.id.localeCompare(b.id));

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
            {sortedCapabilities.map((capability) => (
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
  );
}
