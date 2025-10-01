import React from "react";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { CapabilityPageData } from "@site/src/types/ccc";
import { ThreatsTable } from "../ThreatsTable";

export default function CCCCapabilityTemplate({ pageData }: { pageData: CapabilityPageData }) {
  const { releaseSlug, capability, related_threats } = pageData;

  return (
    <Layout title={`${capability.id} - ${capability.title}`}>
      <Card>
        <CardHeader>
          <CardTitle>
            {capability.id}: {capability.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Capability ID:</span>
              <span>{capability.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Title:</span>
              <span>{capability.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Description:</span>
              <span>{capability.description}</span>
            </div>
          </div>

          <ThreatsTable threats={related_threats || []} releaseSlug={releaseSlug} title="Mapped Threats" />
        </CardContent>
      </Card>
    </Layout>
  );
}
