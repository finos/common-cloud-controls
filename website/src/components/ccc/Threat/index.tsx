import React from "react";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { ThreatPageData } from "@site/src/types/ccc";
import { CapabilitiesTable } from "../CapabilitiesTable";
import { ExternalMappingsTable } from "../ExternalMappingsTable";
import { ControlsTable } from "../ControlsTable";

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

      <CapabilitiesTable capabilities={related_capabilities || []} releaseSlug={releaseSlug} />

      <ExternalMappingsTable mappings={threat["external-mappings"] || []} />

      <ControlsTable controls={related_controls || []} releaseSlug={releaseSlug} />
    </Layout>
  );
}
