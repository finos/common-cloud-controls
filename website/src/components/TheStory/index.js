import React from "react";
import HomeSection from "../HomeSection";

const sectionStyle = {
  maxWidth: "780px",
  margin: "0 auto 2.5rem auto",
};

const bodyStyle = {
  color: "var(--gf-color-text-subtle)",
  fontSize: "1.05rem",
  lineHeight: 1.75,
};

const h3Style = {
  fontSize: "1.2rem",
  fontWeight: 700,
  marginBottom: "0.75rem",
};

const audienceGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "1.25rem",
  maxWidth: "780px",
  margin: "0 auto",
};

const audienceCardStyle = {
  border: "1px solid",
  borderRadius: "1rem",
  padding: "1.25rem 1.5rem",
};

const audiences = [
  {
    label: "Financial institutions",
    body: "Reduce compliance costs, close security gaps, and avoid vendor lock-in. Stop solving the same problems independently and build on a standard your peers helped create.",
  },
  {
    label: "Cloud service providers",
    body: "Certify once against a single, authoritative industry standard instead of meeting a different bar set by every customer.",
  },
  {
    label: "Regulators",
    body: "Map your jurisdiction's requirements to a common framework rather than enforcing bespoke interpretations of cloud risk.",
  },
  {
    label: "Technology teams",
    body: "Use published control catalogs and open-source validators to build and test compliant infrastructure from day one.",
  },
];

export default function TheStory() {
  return (
    <HomeSection title="The Problem">
      <div style={sectionStyle}>
        <p style={bodyStyle}>
          Financial institutions are rapidly adopting public cloud infrastructure,
          yet today's cloud platforms were not designed with the specific requirements
          of financial services in mind.

        </p>
        <p style={bodyStyle}>
          Each major cloud provider operates differently, requiring banks, insurers, and
          asset managers to independently determine how to configure services securely, satisfy
          regulatory requirements, and demonstrate compliance to auditors. Multiply that effort across a growing portfolio
          of cloud services and a patchwork regulatory landscape spanning the US, UK, EU,
          and other jurisdictions, this results in enormous duplication of effort, inconsistent security
          practices, and spiralling compliance costs.
        </p>
        <p style={bodyStyle}>
          Regulators have recognised these challenges. Authorities including the US Treasury, UK HM Treasury,
          the EU through DORA, and the Monetary Authority of Singapore have highlighted common concerns: limited
          transparency from cloud providers, the inability of individual firms to address concentration risk in
          isolation, and a fragmented regulatory environment that may introduce systemic vulnerabilities across
          the financial sector.
        </p>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ ...h3Style, textAlign: "center" }}>The Solution: FINOS Common Cloud Controls</h3>
        <p style={bodyStyle}>
          FINOS CCC is an open industry standard that defines a consistent set of security,
          resiliency, and compliance controls for public cloud services, written once and usable
          across every major cloud provider.
        </p>
        <p style={bodyStyle}>
          Instead of each institution reinventing the wheel, CCC gives the whole financial services
          industry a shared baseline. Cloud providers can certify against it. Regulators can map
          their requirements to it. And banks can use it to deploy compliant cloud infrastructure
          with confidence, regardless of which cloud they're on.
        </p>
        <p style={bodyStyle}>
          CCC classifies cloud services into a common taxonomy, builds a threat model for each
          service type using the MITRE ATT&CK framework, identifies the controls that mitigate
          those threats, and defines what compliant implementation looks like on each cloud
          provider. The result is a machine-verifiable standard that removes ambiguity for everyone.
        </p>
      </div>

      <div style={{ maxWidth: "780px", margin: "0 auto 2.5rem auto" }}>
        <h3 style={{ ...h3Style, textAlign: "center" }}>Who Is It For?</h3>
      </div>
      <div style={audienceGridStyle}>
        {audiences.map(({ label, body }) => (
          <div key={label} style={audienceCardStyle}>
            <p style={{ fontWeight: 700, marginBottom: "0.5rem" }}>{label}</p>
            <p style={{ ...bodyStyle, fontSize: "0.95rem", margin: 0 }}>{body}</p>
          </div>
        ))}
      </div>

      <p style={{ ...bodyStyle, textAlign: "center", maxWidth: "780px", margin: "2rem auto 0 auto", fontSize: "0.95rem" }}>
        CCC is built openly, governed collaboratively, and backed by leading financial institutions,
        cloud providers, and technology organisations from across the industry. It lives on GitHub
        and welcomes contributors.
      </p>
    </HomeSection>
  );
}
