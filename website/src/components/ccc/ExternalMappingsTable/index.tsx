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

// URL mapping function for external frameworks
function getExternalFrameworkUrl(framework: string, entryId: string): string | null {
  const urlMappings: Record<string, (id: string) => string> = {
    "MITRE-ATT&CK": (id: string) => `https://attack.mitre.org/techniques/${id}`,
    "NIST-CSF": (id: string) => `https://csrc.nist.gov/Projects/cybersecurity-framework/glossary#term-${id.toLowerCase()}`,
    NIST_800_53: (id: string) => `https://csrc.nist.gov/projects/cprt/catalog#/cprt/framework/version/SP_800_53_5_2_0/home?keyword=${id}`,
    ISO_27001: (id: string) => `https://www.iso.org/standard/27001`,
    CCM: (id: string) => `https://cloudsecurityalliance.org/artifacts/cloud-controls-matrix-v4/`,
  };

  const urlGenerator = urlMappings[framework];
  return urlGenerator ? urlGenerator(entryId) : null;
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
                    {(() => {
                      const url = getExternalFrameworkUrl(mapping["reference-id"], entry["reference-id"]);
                      return url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">
                          {entry["reference-id"]}
                        </a>
                      ) : (
                        entry["reference-id"]
                      );
                    })()}
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
