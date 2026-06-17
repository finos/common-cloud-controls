import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import Link from "@docusaurus/Link";
import { MappingCountBadge } from "../MappingCountBadge";
import { Capability, Threat } from "@site/src/types/ccc";

interface CapabilitiesTableProps {
  capabilities: Capability[];
  releaseSlug: string;
  title?: string;
  entrySlugs?: Record<string, string>;
}

export function CapabilitiesTable({ capabilities, releaseSlug, title = "Related Capabilities", entrySlugs }: CapabilitiesTableProps) {
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
              {threats && <TableHead>Threat Mappings</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCapabilities.map((capability) => (
              <TableRow key={capability.id}>
                <TableCell>
                  <Link to={entrySlugs?.[capability.id] ?? `${releaseSlug}/${capability.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                    {capability.id}
                  </Link>
                </TableCell>
                <TableCell>{capability.title}</TableCell>
                <TableCell>{capability.description}</TableCell>
                {threats && (
                  <TableCell>
                    <MappingCountBadge
                      count={
                        threats.filter((threat) =>
                          threat.capabilities?.some((cap) =>
                            cap.entries?.some((entry) => entry["reference-id"] === capability.id)
                          )
                        ).length
                      }
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
