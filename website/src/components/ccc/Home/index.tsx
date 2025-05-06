import React from "react";
import Layout from "@theme/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import Link from "@docusaurus/Link";
import { HomePageData } from "@site/src/types/ccc";
import { User } from "../User";

export default function CCCHomeTemplate({ pageData }: { pageData: HomePageData }) {
  const { components } = pageData;
  const objectStorage = components.find((c) => c.title === "Object Storage");
  if (objectStorage.releases && objectStorage.releases.length < 2) {
    objectStorage.releases.push({
      metadata: {
        title: "Object Storage",
        id: "CCC.ObjStor.2",
        description: "Dummy second release for testing purposes.",
        release_details: [
          {
            version: "2025.02",
            assurance_level: "Moderate",
            threat_model_url: "https://example.com/threat-model",
            threat_model_author: "Jane Doe",
            red_team: "RedOps",
            red_team_exercise_url: "https://example.com/red-team",
            release_manager: {
              name: "Damien Burks",
              github_id: "damienjburks",
              company: "Citi",
              summary: "This initial release is part of the first batch of control catalogs\nproduced by the CCC. It is the result of thousands of hours dedicated to\nexploring different ways of working and collaborating, on top of time\nspent researching, writing, and reviewing the content. This marks a huge\nmilestone for the CCC and the broader community as further releases will\ncontinue to build on this foundation. A huge thanks to everyone who has\nbrought us to this point!\n",
            },
            change_log: ["Added dummy threat model and red team information.", "No functional changes."],
            contributors: [
              {
                name: "Jane Doe",
                github_id: "janedoe",
                company: "Acme Inc",
              },
            ],
          },
        ],
      },
      slug: "/ccc/CCC.ObjStor.2025.01",
      controls: [],
      threats: [
        {
          id: "CCC.TH01",
          title: "Access Control is Misconfigured",
          description: "An attacker can exploit misconfigured access controls to grant excessive\nprivileges or gain unauthorized access to sensitive resources.\n",
          features: ["CCC.F06"],
          mitre_technique: ["T1078", "T1548", "T1203", "T1098", "T1484", "T1546", "T1537", "T1567", "T1048", "T1485", "T1565", "T1027"],
          link: "cccth01---access-control-is-misconfigured",
          slug: "/ccc/CCC.ObjStor.2025.01/CCC.TH01",
        },
        {
          id: "CCC.TH02",
          title: "Data is Intercepted in Transit",
          description: "In the event that encrypted communication is not properly in effect, an\nattacker can intercept traffic between clients and the service to read or\nmodify the data during transmission.\n",
          features: ["CCC.F01"],
          mitre_technique: ["T1557", "T1040"],
          link: "cccth02---data-is-intercepted-in-transit",
          slug: "/ccc/CCC.ObjStor.2025.01/CCC.TH02",
        },
        {
          id: "CCC.TH03",
          title: "Deployment Region Network is Untrusted",
          description: "If any part of the service is deployed in a hostile, unstable, or\ninsecure location, an attacker may attempt to access the resource or\nintercept data by exploiting privileged network access or physical\nvulnerabilities.\n",
          features: ["CCC.F08"],
          mitre_technique: ["T1040", "T1110", "T1105", "T1583", "T1557"],
          link: "cccth03---deployment-region-network-is-untrusted",
          slug: "/ccc/CCC.ObjStor.2025.01/CCC.TH03",
        },
        {
          id: "CCC.TH04",
          title: "Data is Replicated to Untrusted or External Locations",
          description: "An attacker could replicate data to untrusted or external locations if replication configurations\nare not properly restricted. This could result in data leakage or exposure to unauthorized entities\noutside the organization's trusted perimeter.\n",
          features: ["CCC.F21"],
          mitre_technique: ["T1565"],
          link: "cccth04---data-is-replicated-to-untrusted-or-external-locations",
          slug: "/ccc/CCC.ObjStor.2025.01/CCC.TH04",
        },
        {
          id: "CCC.TH05",
          title: "Data is Corrupted During Replication",
          description: "Malicious actors may attempt to corrupt, delay, or delete data during\nreplication processes across multiple regions or availability zones,\naffecting the integrity and availability of data.\n",
          features: ["CCC.F08", "CCC.F12", "CCC.F21"],
          mitre_technique: ["T1485", "T1565", "T1491", "T1490"],
          link: "cccth05---data-is-corrupted-during-replication",
          slug: "/ccc/CCC.ObjStor.2025.01/CCC.TH05",
        },
        {
          id: "CCC.TH06",
          title: "Data is Lost or Corrupted",
          description: "Data loss or corruption can occur due to accidental deletion,\nmisconfiguration, or malicious activity.  This can result in the loss of\ncritical data, service disruption, or unauthorized access to sensitive\ninformation.\n",
          features: ["CCC.F11", "CCC.F18"],
          mitre_technique: ["T1485", "T1565", "T1491", "T1490"],
          link: "cccth06---data-is-lost-or-corrupted",
          slug: "/ccc/CCC.ObjStor.2025.01/CCC.TH06",
        },
        {
          id: "CCC.TH07",
          title: "Logs are Tampered With or Deleted",
          description: "Attackers may tamper with or delete logs to cover their tracks and evade\ndetection. This prevents security teams from identifying the full scope\nof an attack and may disrupt forensic investigations.\n",
          features: ["CCC.F03", "CCC.F10"],
          mitre_technique: ["T1070", "T1565", "T1027"],
          link: "cccth07---logs-are-tampered-with-or-deleted",
          slug: "/ccc/CCC.ObjStor.2025.01/CCC.TH07",
        },
        {
          id: "CCC.TH08",
          title: "Cost Management Data is Manipulated",
          description: "Attackers may manipulate cost management data to hide excessive resource\nconsumption or to deceive users about resource usage. This could be used\nto exhaust budgets, cause financial losses, or evade detection of other attacks.\n",
          features: ["CCC.F15"],
          mitre_technique: ["T1565", "T1070"],
          link: "cccth08---cost-management-data-is-manipulated",
          slug: "/ccc/CCC.ObjStor.2025.01/CCC.TH08",
        },
        {
          id: "CCC.TH09",
          title: "Logs or Monitoring Data are Read by Unauthorized Users",
          description: "Unauthorized access to logs or monitoring data can provide attackers with\nvaluable information about the system's configuration, operations, and\nsecurity mechanisms. This can be used to identify vulnerabilities, plan\nattacks, or evade detection.\n",
          features: ["CCC.F03", "CCC.F09"],
          mitre_technique: ["T1003", "T1007", "T1018", "T1033", "T1046", "T1057", "T1069", "T1070", "T1082", "T1120", "T1124", "T1497", "T1518"],
          link: "cccth09---logs-or-monitoring-data-are-read-by-unauthorized-users",
          slug: "/ccc/CCC.ObjStor.2025.01/CCC.TH09",
        },
        {
          id: "CCC.TH10",
          title: "Alerts are Intercepted",
          description: "Malicious actors may exploit event notifications to monitor and\nintercept information about sensitive operations or access patterns.\n",
          features: ["CCC.F03", "CCC.F07", "CCC.F09", "CCC.F17"],
          mitre_technique: ["T1057", "T1049", "T1083"],
          link: "cccth10---alerts-are-intercepted",
          slug: "/ccc/CCC.ObjStor.2025.01/CCC.TH10",
        },
        {
          id: "CCC.TH11",
          title: "Event Notifications are Incorrectly Triggered",
          description: "Malicious actors may exploit event notifications to trigger sensitive\noperations or access patterns. Alternately, attackers may flood the\nsystem with notifications to obfuscate another attack or overwhelm the\nservice to disrupt legitimate operations.\n",
          features: ["CCC.F07", "CCC.F17"],
          mitre_technique: ["T1205", "T1001.001", "T1491.001"],
          link: "cccth11---event-notifications-are-incorrectly-triggered",
          slug: "/ccc/CCC.ObjStor.2025.01/CCC.TH11",
        },
        {
          id: "CCC.TH12",
          title: "Resource Constraints are Exhausted",
          description: "An attack or misconfiguration can consume all available resources, such\nas memory, CPU, or storage, to disrupt the service or deny access to\nlegitimate users. This can be achieved through repeated requests,\nresource-intensive operations, or the lowering of rate/budget limits.\nThrough auto-scaling, the attacker may also attempt to exhaust\nhigher-level budget thresholds to impact other systems in the same scope.\n",
          features: ["CCC.F04", "CCC.F16", "CCC.F19"],
          mitre_technique: ["T1496", "T1499", "T1498"],
          link: "cccth12---resource-constraints-are-exhausted",
          slug: "/ccc/CCC.ObjStor.2025.01/CCC.TH12",
        },
        {
          id: "CCC.TH13",
          title: "Resource Tags are Manipulated",
          description: "Attackers may manipulate resource tags to alter organizational policies,\ndisrupt billing, or evade detection. This can result in mismanaged\nresources, unauthorized access, or financial abuse.\n",
          features: ["CCC.F20"],
          mitre_technique: ["T1565"],
          link: "cccth13---resource-tags-are-manipulated",
          slug: "/ccc/CCC.ObjStor.2025.01/CCC.TH13",
        },
        {
          id: "CCC.TH14",
          title: "Older Resource Versions are Exploited",
          description: "Attackers may exploit vulnerabilities in older versions of resources,\ntaking advantage of deprecated or insecure configurations. Without\nproper version control and monitoring, outdated versions can be used\nto bypass security measures.\n",
          features: ["CCC.F18"],
          mitre_technique: ["T1027", "T1485", "T1565", "T1489", "T1562.01", "T1027", "T1485", "T1565", "T1489"],
          link: "cccth14---older-resource-versions-are-exploited",
          slug: "/ccc/CCC.ObjStor.2025.01/CCC.TH14",
        },
      ],
      features: [],
    });
  }
  // Flatten all releases into a single array with component title
  const allReleases = components.flatMap((component) =>
    component.releases.map((release) => ({
      ...release,
      componentTitle: component.title,
    }))
  );
  // Transform components into a summary list
  const componentSummaries = components.map((component) => {
    const allDetails = component.releases.flatMap((r) => r.metadata.release_details);
    const latestRelease = allDetails.reduce((latest, current) => {
      return current.version > latest.version ? current : latest;
    }, allDetails[0]);

    return {
      id: component.releases[0].metadata.id,
      title: component.title,
      numberOfReleases: component.releases.length,
      latestVersion: latestRelease.version,
      slug: component.releases[0].slug,
    };
  });

  return (
    <Layout title="Common Cloud Controls">
      <main className="container margin-vert--lg space-y-8">
        <div className="text-center">
          <h1>Common Cloud Controls</h1>
          <p className="text-xl text-muted-foreground">All Releases</p>
        </div>
        {/* <pre>{JSON.stringify(components, null, 2)}</pre> */}
        {/* {components.map((category) =>
          category.releases.map((release) =>
            release.controls.map((control) => (
              <div key={control.id}>
                <pre>{JSON.stringify(control.control_mappings, null, 2)}</pre>
              </div>
            ))
          )
        )} */}
        <Card>
          <CardHeader>
            <CardTitle>Components Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component Title</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Number of Releases</TableHead>
                  <TableHead>Latest Version</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {componentSummaries.map((comp) => (
                  <TableRow key={comp.id}>
                    <TableCell>
                      <Link to={comp.slug} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {comp.title}
                      </Link>
                    </TableCell>
                    <TableCell>{comp.id}</TableCell>
                    <TableCell>{comp.numberOfReleases}</TableCell>
                    <TableCell>{comp.latestVersion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Releases</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Release Manager</TableHead>
                  <TableHead>Authors</TableHead>
                  <TableHead>Controls</TableHead>
                  <TableHead>Threats</TableHead>
                  <TableHead>Features</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allReleases.map((release) => (
                  <TableRow key={release.metadata.id}>
                    <TableCell>{release.componentTitle}</TableCell>
                    {/* <TableCell>
                      <Link to={release.slug} className="text-blue-600 underline hover:text-blue-800">
                        {release.slug}
                      </Link>
                    </TableCell> */}
                    <TableCell>
                      <Link to={release.slug} className="text-blue-600  hover:text-blue-800 hover:underline">
                        {release.slug.split("/").pop()}
                      </Link>
                    </TableCell>
                    <TableCell>{release.metadata.release_details[0].version}</TableCell>
                    <TableCell>
                      <User name={release.metadata.release_details[0].release_manager.name} githubId={release.metadata.release_details[0].release_manager.github_id} company={release.metadata.release_details[0].release_manager.company} avatarUrl={`https://github.com/${release.metadata.release_details[0].release_manager.github_id}.png`} />
                    </TableCell>
                    <TableCell>{release.metadata.release_details[0].contributors.length}</TableCell>
                    <TableCell>{release.controls.length}</TableCell>
                    <TableCell>{release.threats.length}</TableCell>
                    <TableCell>{release.features.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
