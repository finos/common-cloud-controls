import React from "react";
import HomeSection from "../HomeSection";
import styles from "./styles.module.css";

const journey = [
  {
    verb: "Research",
    title: "System Capabilities",
    body: "Examine your specific technology stack to pinpoint exactly where you are exposed to negative impacts. By identifying specific threats, you can seamlessly apply precise, actionable controls to mitigate those exact vulnerabilities.",
  },
  {
    verb: "Import",
    title: "Reusable Definitions",
    body: "Establish a foundational baseline of reusable, technology-agnostic threat and control definitions. This prevents your team from needing to write arbitrary security rules from scratch and ensures interoperability.",
  },
  {
    verb: "Define",
    title: "Risk-Informed Policies",
    body: "Create clearly scoped rules tailored to your organization's specific risk appetite. Instead of treating compliance as abstract suggestions, use your selected controls as executable design requirements that guide safe implementation.",
  },
  {
    verb: "Automate",
    title: "Compliance Evaluations",
    body: "Translate your controls' specific assessment requirements into automated configuration scans and behavioral tests. This allows your tools to continuously measure reality against expectations without slowing down your development pipelines.",
  },
  {
    verb: "Enforce",
    title: "Control Objectives",
    body: "Wire these automated evaluations directly into your software development lifecycle as deployment gates. This automated enforcement blocks non-compliant resources and misconfigurations before they ever reach production.",
  },
  {
    verb: "Monitor",
    title: "Production Systems",
    body: "Establish a continuous, policy-driven process that harnesses multiple systems to gather immutable logs and artifacts automatically. This guarantees ongoing compliance and vastly simplifies formal audits by providing highly verifiable, easily accessible evidence.",
  },
];

export default function AdvanceAutomatedGovernance() {
  return (
    <div>
      <HomeSection title="Advance Your Automated Governance">
        <div className={styles.outerContainer}>
          <div className={styles.timelineContainer}>
            <div className={styles.timelineLine} />
            {journey.map((step) => (
              <div key={step.verb} className={styles.stepItem}>
                <div className={styles.stepDot} />
                <p className={styles.stepHeading}>
                  <span className={styles.stepVerb}>{step.verb} </span>
                  <span>{step.title}</span>
                </p>
                <p className={styles.stepBody}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </HomeSection>
      <HomeSection>
        <div>
          <h3 className={styles.sectionTitle}>Where CCC Fits In</h3>
          <p className={styles.prose}>
            Automated governance pipelines are built in layers, and FINOS Common Cloud Controls (CCC) operates at{" "}
            <strong className={styles.accentText}>Layer 2</strong> of the{" "}
            <a href="https://github.com/gemaraproj/go-gemara" target="_blank" rel="noopener noreferrer" className={styles.accentLink}>
              Gemara
            </a>
            {" "}model: Threats and Controls. Sitting above high-level guidance (Layer 1) and below your organization's specific policies (Layer 3), CCC acts as the vital bridge that translates abstract best practices into actionable, threat-informed safeguards.
          </p>
          <p className={styles.prose}>
            At this layer, your team defines what a secure system looks like in a reusable, technology-agnostic way. By focusing on specifically scoped threats and controls with clear assessment requirements, CCC empowers you to build interoperable resources that seamlessly inform your policies and guide automated evaluation tools across different environments.
          </p>
          <p className={styles.prose}>
            Furthermore, the practical needs of projects like CCC actually helped form the genesis of the Gemara model itself. Because real-world automated governance requires separating high-level concepts from specific implementations, Gemara provides the machine-optimized document schemas that allow CCC's layered artifacts to interoperate flawlessly throughout your secure software factory.
          </p>
        </div>
        <div>
          <h3 className={styles.catalogsTitle}>Three Catalogs, One Complete Picture</h3>
        </div>
        <div className={styles.catalogsLayout}>
          <div className={styles.catalogsText}>
            <p className={styles.prose}>
              Each cloud service is covered by three interlocking catalog types — Capabilities, Threats, and Controls — because real-world governance requires all three layers to be explicit and independently reusable.
            </p>
            <p className={styles.prose}>
              Keeping them separate means your team can import only what is relevant, compose new service catalogs from existing building blocks, and map controls directly to the threats they mitigate — without carrying the weight of definitions you don't need.
            </p>
          </div>
          <div className={styles.catalogsImageWrapper}>
            <img
              src="/img/diagrams/catalogs-diagram.svg"
              alt="CCC catalog structure diagram"
              className={styles.catalogsImage}
            />
          </div>
        </div>
      </HomeSection>
    </div>
  );
}
