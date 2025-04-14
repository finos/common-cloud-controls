import React from "react";
import Layout from "@theme/Layout";
import styles from "./styles.module.css";
import { Control } from "../Control";
import Link from "@docusaurus/Link";

interface ReleaseManager {
  name: string;
  github_id: string;
  company: string;
  summary: string;
}

interface Contributor {
  name: string;
  github_id: string;
  company: string;
}

interface ReleaseDetails {
  version: string;
  assurance_level: string | null;
  threat_model_url: string | null;
  threat_model_author: string | null;
  red_team: string | null;
  red_team_exercise_url: string | null;
  release_manager: ReleaseManager;
  change_log: string[];
  contributors: Contributor[];
}

interface Metadata {
  title: string;
  id: string;
  description: string;
  release_details: ReleaseDetails[];
}

interface CCCPageData {
  slug: string;
  metadata: Metadata;
  controls: Control[];
}

export default function CCCReleaseTemplate({ pageData }: { pageData: CCCPageData }) {
  const { slug, metadata, controls } = pageData;
  const release = metadata.release_details?.[0];

  return (
    <Layout title={metadata.title}>
      <main className="container margin-vert--lg">
        <h1>{metadata.title}</h1>
        <p className={styles.description}>{metadata.description}</p>

        <section className={styles.section}>
          <h2>Release Details</h2>
          <ul>
            <li>
              <strong>Version:</strong> {release?.version}
            </li>
            <li>
              <strong>Assurance Level:</strong> {release?.assurance_level}
            </li>
            <li>
              <strong>Release Manager:</strong> {release?.release_manager?.name} ({release?.release_manager?.company})
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Contributors</h2>
          <ul className={styles.contributors}>
            {release?.contributors?.map((c: any) => (
              <li key={c.github_id}>
                <strong>{c.name}</strong> — {c.company} (
                <a href={`https://github.com/${c.github_id}`} target="_blank" rel="noopener noreferrer">
                  {c.github_id}
                </a>
                )
              </li>
            ))}
          </ul>
        </section>

        {release?.change_log && (
          <section className={styles.section}>
            <h2>Change Log</h2>
            <ul>
              {release.change_log.map((log: string, idx: number) => (
                <li key={idx}>{log}</li>
              ))}
            </ul>
          </section>
        )}

        <section className={styles.section}>
          <h2>Controls</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Objective</th>
                <th>Control Family</th>
              </tr>
            </thead>
            <tbody>
              {controls.map((control) => (
                <tr key={control.id}>
                  <td>
                    <Link to={`/ccc/${slug}/${control.id}`}>{control.id}</Link>
                  </td>
                  <td>{control.title}</td>
                  <td>{control.objective}</td>
                  <td>{control.control_family}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </Layout>
  );
}
