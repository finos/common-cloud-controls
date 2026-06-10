import React from "react";
import HomeSection from "../HomeSection";

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
      <div style={{ maxWidth: "850px", margin: "0 auto", marginTop: "4rem" }}>

        <div style={{ maxWidth: "850px", margin: "0 auto", position: "relative", paddingLeft: "2rem" }}>
          <div style={{
            position: "absolute",
            left: "0.4rem",
            top: "0.6rem",
            bottom: "0.6rem",
            width: "2px",
            background: "rgb(0, 181, 226)",
            borderRadius: "1px",
            opacity: 0.4,
          }} />
          {journey.map((step, i) => (
            <div key={step.verb} style={{ position: "relative"}}>
              <div style={{
                position: "absolute",
                left: "-2rem",
                top: "0.35rem",
                width: "0.85rem",
                height: "0.85rem",
                borderRadius: "50%",
                background: "rgb(0, 134, 191)",
              }} />
              <p style={{ margin: "0 0 0.35rem", fontSize: "1.1rem", fontWeight: 700, lineHeight: 1.2 }}>
                <span style={{ color: "rgb(0, 134, 191)" }}>{step.verb} </span>
                <span>{step.title}</span>
              </p>
              <p style={{ margin: 0, color: "var(--gf-color-text-subtle)", lineHeight: 1.7, fontSize: "0.975rem", marginTop: ".75rem", marginBottom: "1.50rem" }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
      </HomeSection>
      <HomeSection>
        <div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 700, textAlign: "center", marginTop: "1rem" , marginBottom: "2rem" }}>
            Where CCC Fits In
          </h3>
          <p style={{ lineHeight: 1.75, fontSize: "0.975rem" }}>
            Automated governance pipelines are built in layers, and FINOS Common Cloud Controls (CCC) operates at <strong style={{ color: "var(--gf-color-text)" }}>Layer 2</strong> of the{" "}
            <a href="https://github.com/gemaraproj/go-gemara" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gf-color-accent)" }}>Gemara</a>
            {" "}model: Threats and Controls. Sitting above high-level guidance (Layer 1) and below your organization's specific policies (Layer 3), CCC acts as the vital bridge that translates abstract best practices into actionable, threat-informed safeguards.
          </p>
          <p style={{ lineHeight: 1.75, fontSize: "0.975rem" }}>
            At this layer, your team defines what a secure system looks like in a reusable, technology-agnostic way. By focusing on specifically scoped threats and controls with clear assessment requirements, CCC empowers you to build interoperable resources that seamlessly inform your policies and guide automated evaluation tools across different environments.
          </p>
          <p style={{ lineHeight: 1.75, fontSize: "0.975rem" }}>
            Furthermore, the practical needs of projects like CCC actually helped form the genesis of the Gemara model itself. Because real-world automated governance requires separating high-level concepts from specific implementations, Gemara provides the machine-optimized document schemas that allow CCC's layered artifacts to interoperate flawlessly throughout your secure software factory.
          </p>
        </div>
        <div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 700, textAlign: "center", marginTop: "4rem", marginBottom: "2rem" }}>
            Three Catalogs, One Complete Picture
          </h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "220px" }}>
            <p style={{ lineHeight: 1.75, fontSize: "0.975rem" }}>
              Each cloud service is covered by three interlocking catalog types — Capabilities, Threats, and Controls — because real-world governance requires all three layers to be explicit and independently reusable.
            </p>
            <p style={{ lineHeight: 1.75, fontSize: "0.975rem" }}>
              Keeping them separate means your team can import only what is relevant, compose new service catalogs from existing building blocks, and map controls directly to the threats they mitigate — without carrying the weight of definitions you don't need.
            </p>
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <img
              src="/img/diagrams/catalogs-diagram.svg"
              alt="CCC catalog structure diagram"
              style={{ display: "block", maxWidth: "270px", width: "100%", height: "auto" }}
            />
          </div>
        </div>
      </HomeSection >
    </div>  
  );
}
