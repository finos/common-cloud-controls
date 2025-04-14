import React from "react";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import Link from "@docusaurus/Link";

interface Feature {
  id: string;
  title: string;
  description: string;
}

interface FeaturePageData {
  slug: string;
  feature: Feature;
  releaseTitle: string;
  releaseId: string;
}

export default function CCCFeatureTemplate({ pageData }: { pageData: FeaturePageData }) {
  const { slug, feature, releaseTitle, releaseId } = pageData;

  return (
    <Layout title={`${feature.id} - ${feature.title}`}>
      <main className="container margin-vert--lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <Link to={`/ccc/${slug}`} className="text-muted-foreground hover:underline">
                {releaseTitle}
              </Link>
              {" > "}
              {feature.id} - {feature.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Feature ID:</span>
                <span className="font-mono">{feature.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Title:</span>
                <span>{feature.title}</span>
              </div>
              <div className="space-y-2">
                <span className="font-medium">Description:</span>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
