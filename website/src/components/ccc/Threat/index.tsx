import React from "react";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import Link from "@docusaurus/Link";
import { Badge } from "../../ui/badge";

interface Threat {
  id: string;
  title: string;
  description: string;
  features: string[];
  mitre_technique: string[];
}

interface ThreatPageData {
  slug: string;
  threat: Threat;
  releaseTitle: string;
  releaseId: string;
}

export default function CCCThreatTemplate({ pageData }: { pageData: ThreatPageData }) {
  const { slug, threat, releaseTitle, releaseId } = pageData;

  return (
    <Layout title={`${threat.id} - ${threat.title}`}>
      <main className="container margin-vert--lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <Link to={`/ccc/${slug}`} className="text-muted-foreground hover:underline">
                {releaseTitle}
              </Link>
              {" > "}
              {threat.id} - {threat.title}
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
              {threat.features && threat.features.length > 0 && (
                <div className="space-y-2">
                  <span className="font-medium">Related Features:</span>
                  <div className="flex flex-wrap gap-2">
                    {threat.features.map((featureId) => (
                      <Link key={featureId} to={`/ccc/${slug}/${featureId}`}>
                        <Badge variant="secondary">{featureId}</Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {threat.mitre_technique && threat.mitre_technique.length > 0 && (
                <div className="space-y-2">
                  <span className="font-medium">MITRE ATT&CK Techniques:</span>
                  <div className="flex flex-wrap gap-2">
                    {threat.mitre_technique.map((technique) => (
                      <a key={technique} href={`https://attack.mitre.org/techniques/${technique}`} target="_blank" rel="noopener noreferrer">
                        <Badge variant="outline">{technique}</Badge>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
