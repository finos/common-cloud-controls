import React from "react";
import HomeSection from "../HomeSection";
const journey = [
  {
    verb: "Research",
    title: "System Capabilities",
    body: "Capabilities Examine your specific technology stack to pinpoint exactly where you are exposed to negative impacts. By identifying specific threats, you can seamlessly apply precise, actionable controls to mitigate those exact vulnerabilities.",
  },
  {
    verb: "Import",
    title: "Reusable Definitions",
    body: "Establish a foundational baseline of reusable, technology-agnostic threat and control definitions. This prevents your team from needing to write arbitrary security rules from scratch and ensures interoperability."
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
    <HomeSection title="Advance Your Automated Governance">
      <div style={{ position: "relative", paddingLeft: "2rem" }}>
              {/* vertical line */}
              <div style={{
                position: "absolute",
                left: "0.45rem",
                top: "0.6rem",
                bottom: "0.6rem",
                width: "2px",
                background: "#777c85",
                borderRadius: "1px",
                opacity: 0.4,
              }} />
              {journey.map((step, i) => (
                <div key={step.verb} style={{ position: "relative", marginBottom: i < journey.length - 1 ? "var(--gf-space-xl)" : 0 }}>
                  {/* node dot */}
                  <div style={{
                    position: "absolute",
                    left: "-2rem",
                    top: "0.35rem",
                    width: "0.85rem",
                    height: "0.85rem",
                    borderRadius: "50%",
                    background: "#777c85",
                  }} />
                  <p style={{ margin: "0 0 0.35rem", fontSize: "1.1rem", fontWeight: 700, lineHeight: 1.2 }}>
                    <span style={{ color: "#777c85" }}>{step.verb} </span>
                    <span>{step.title}</span>
                  </p>
                  <p style={{ margin: 0, color: "var(--gf-color-text-subtle)", lineHeight: 1.7, fontSize: "0.975rem" }}>
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
    </HomeSection>
  );
}
