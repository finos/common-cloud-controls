import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { ControlPageData } from "@site/src/types/ccc";
import controlMappings from "../../../data/control-mappings/controlMappins.json";

export default function CCCControlTemplate({ pageData }: { pageData: ControlPageData }) {
  const { control, releaseTitle, releaseSlug } = pageData;
  const controlIdToUrl = Object.fromEntries(controlMappings.controls.map((ctrl) => [ctrl.id, ctrl.url]));
  <pre>{JSON.stringify(controlIdToUrl, null, 2)}</pre>;
  console.log("COntrol mappings", JSON.stringify(controlIdToUrl, null, 2));
  console.log(JSON.stringify(pageData, null, 2));

  return (
    <Layout title={control.title}>
      <main className="container margin-vert--lg space-y-6">
        <Link to={releaseSlug} className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
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
                <Badge variant="outline" className="bg-blue-100 text-blue-800 font-medium border border-blue-300">
                  {control.control_family}
                </Badge>
              </div>

              {control.related_threats?.length > 0 && (
                <div className="space-y-2">
                  <span className="font-medium">Threats:</span>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {control.related_threats.map((threat) => (
                        <TableRow key={threat.id}>
                          <TableCell>
                            <Link to={threat.slug} className="text-blue-600 hover:text-blue-800 hover:underline">
                              {threat.id}
                            </Link>
                          </TableCell>
                          <TableCell>{threat.title}</TableCell>
                          <TableCell>{threat.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {control.nist_csf && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">NIST CSF:</span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 font-medium border border-blue-300">
                    {control.nist_csf}
                  </Badge>
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
                      {values.map((value) => {
                        const url = controlIdToUrl[value];
                        return (
                          <Badge key={value} variant="outline" className="bg-blue-100 text-blue-600 font-medium border border-blue-300 hover:bg-blue-300 hover:border-blue-400 hover:text-blue-900">
                            {url ? (
                              <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
                                {value}
                              </a>
                            ) : (
                              value
                            )}
                          </Badge>
                        );
                      })}
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
                            <Badge key={level} variant="outline" className="bg-blue-100 text-blue-800 font-medium border border-blue-300">
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
