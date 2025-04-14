import { TestRequirement } from "../TestRequirement";
import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";

export interface Control {
  id: string;
  title: string;
  objective: string;
  control_family: string;
  threats?: string[];
  nist_csf?: string;
  control_mappings?: ControlMappings;
  test_requirements?: TestRequirement[];
  link?: string;
}

interface ControlMappings {
  [key: string]: string[];
}

interface PageData {
  slug: string;
  control: Control;
  releaseTitle: string;
  releaseId: string;
}

export default function CCCControlTemplate({ pageData }: { pageData: PageData }) {
  const { control, slug, releaseTitle } = pageData;

  return (
    <Layout title={control.title}>
      <main className="container margin-vert--lg space-y-6">
        <Link to={`/ccc/${slug}`} className="text-primary hover:underline flex items-center gap-1">
          ← Back to {releaseTitle}
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>
              {control.id}: {control.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Objective:</span>
                <span>{control.objective}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Control Family:</span>
                <Badge variant="secondary">{control.control_family}</Badge>
              </div>

              {control.threats?.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Threats:</span>
                  <div className="flex flex-wrap gap-2">
                    {control.threats.map((threat) => (
                      <Badge key={threat} variant="outline">
                        {threat}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {control.nist_csf && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">NIST CSF:</span>
                  <Badge variant="outline">{control.nist_csf}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {control.control_mappings && (
          <Card>
            <CardHeader>
              <CardTitle>Control Mappings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(control.control_mappings).map(([framework, values]) => (
                  <div key={framework} className="flex items-center gap-2">
                    <span className="font-medium">{framework}:</span>
                    <div className="flex flex-wrap gap-2">
                      {values.map((value) => (
                        <Badge key={value} variant="outline">
                          {value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {control.test_requirements?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {control.test_requirements.map((tr) => (
                  <div key={tr.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tr.id}:</span>
                      <span>{tr.text}</span>
                    </div>
                    {tr.tlp_levels?.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">TLP:</span>
                        <div className="flex flex-wrap gap-2">
                          {tr.tlp_levels.map((level) => (
                            <Badge key={level} variant="outline">
                              {level}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </Layout>
  );
}
