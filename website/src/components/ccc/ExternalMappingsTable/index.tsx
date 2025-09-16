import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { MappingCountBadge } from "../MappingCountBadge";
import { Mapping } from "@site/src/types/ccc";

interface ExternalMappingsTableProps {
  mappings: Mapping[];
  title?: string;
}

export function ExternalMappingsTable({ mappings, title = "External Mappings" }: ExternalMappingsTableProps) {
  if (!mappings || mappings.length === 0) {
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
              <TableHead>Reference ID</TableHead>
              <TableHead>Entry ID</TableHead>
              <TableHead>Strength</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((mapping, mappingIndex) =>
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
  );
}
