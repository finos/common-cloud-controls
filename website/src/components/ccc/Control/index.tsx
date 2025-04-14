import { TestRequirement } from "../TestRequirement";

import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import styles from "./styles.module.css";

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
      <main className="container margin-vert--lg">
        <Link to={`/ccc/${slug}`}>&larr; Back to {releaseTitle}</Link>
        <h1>
          {control.id}: {control.title}
        </h1>

        <section className={styles.section}>
          <p>
            <strong>Objective:</strong> {control.objective}
          </p>
          <p>
            <strong>Control Family:</strong> {control.control_family}
          </p>

          {control.threats?.length > 0 && (
            <p>
              <strong>Threats:</strong> {control.threats.join(", ")}
            </p>
          )}

          {control.nist_csf && (
            <p>
              <strong>NIST CSF:</strong> {control.nist_csf}
            </p>
          )}
        </section>

        {control.control_mappings && (
          <section className={styles.section}>
            <h2>Control Mappings</h2>
            <ul>
              {Object.entries(control.control_mappings).map(([framework, values]) => (
                <li key={framework}>
                  <strong>{framework}:</strong> {values.join(", ")}
                </li>
              ))}
            </ul>
          </section>
        )}

        {control.test_requirements?.length > 0 && (
          <section className={styles.section}>
            <h2>Test Requirements</h2>
            <ul>
              {control.test_requirements.map((tr) => (
                <li key={tr.id}>
                  <p>
                    <strong>{tr.id}</strong>: {tr.text}
                  </p>
                  {tr.tlp_levels?.length > 0 && (
                    <p>
                      <em>TLP: {tr.tlp_levels.join(", ")}</em>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </Layout>
  );
}
