import React, { useState } from "react";
import HomeSection from "../HomeSection";
import styles from "./styles.module.css";

const sectionStyle = {
  maxWidth: "780px",
  margin: "0 auto 2.5rem auto",
};

const bodyStyle = {
  color: "var(--gf-color-text-subtle)",
  fontSize: "1.05rem",
  textAlign: "center",
  lineHeight: 1.75,
};

const h3Style = {
  fontSize: "2rem",
  fontWeight: 700,
  marginBottom: "1.5rem",
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

function ChevronIcon({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        width: "1.1rem",
        height: "1.1rem",
        transition: "transform 0.25s ease",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        flexShrink: 0,
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CollapsibleBox({ title, firstParagraph, extraParagraphs }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        ...sectionStyle,
        border: "1px solid #00b5e2",
        borderRadius: "1rem",
        padding: "1.5rem 1rem",
        overflow: "hidden",
      }}
    >
      {title && <h3 style={{ ...h3Style, textAlign: "center" }}>{title}</h3>}
      <p style={{ ...bodyStyle, margin: 0 }}>{firstParagraph}</p>

      {open && (
        <div style={{ marginTop: "1rem" }}>
          {extraParagraphs.map((para, i) => (
            <p key={i} style={{ ...bodyStyle, marginTop: i > 0 ? "1rem" : 0, marginBottom: 0 }}>
              {para}
            </p>
          ))}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#00b5e2",
            padding: "0.25rem 0.75rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.9rem",
            fontWeight: 600,
            borderRadius: "999px",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,181,226,0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          {open ? "Show less" : "Read more"}
          <ChevronIcon open={open} />
        </button>
      </div>
    </div>
  );
}

export default function TheStory() {
  return (
    <HomeSection>
      <CollapsibleBox
        title="The Problem"
        firstParagraph="Financial institutions are rapidly adopting public cloud infrastructure, yet today's cloud platforms were not designed with the specific requirements of financial services in mind."
        extraParagraphs={[
          "Each major cloud provider operates differently, requiring banks, insurers, and asset managers to independently determine how to configure services securely, satisfy regulatory requirements, and demonstrate compliance to auditors. Multiply that effort across a growing portfolio of cloud services and a patchwork regulatory landscape spanning the US, UK, EU, and other jurisdictions, this results in enormous duplication of effort, inconsistent security practices, and spiralling compliance costs.",
          "Regulators have recognised these challenges. Authorities including the US Treasury, UK HM Treasury, the EU through DORA, and the Monetary Authority of Singapore have highlighted common concerns: limited transparency from cloud providers, the inability of individual firms to address concentration risk in isolation, and a fragmented regulatory environment that may introduce systemic vulnerabilities across the financial sector.",
        ]}
      />

      <CollapsibleBox
        title="The Solution: FINOS Common Cloud Controls"
        firstParagraph="FINOS CCC is an open industry standard that defines a consistent set of security, resiliency, and compliance controls for public cloud services, written once and usable across every major cloud provider."
        extraParagraphs={[
          "Instead of each institution reinventing the wheel, CCC gives the whole financial services industry a shared baseline. Cloud providers can certify against it. Regulators can map their requirements to it. And banks can use it to deploy compliant cloud infrastructure with confidence, regardless of which cloud they're on.",
          "CCC classifies cloud services into a common taxonomy, builds a threat model for each service type using the MITRE ATT&CK framework, identifies the controls that mitigate those threats, and defines what compliant implementation looks like on each cloud provider. The result is a machine-verifiable standard that removes ambiguity for everyone.",
        ]}
      />

      <div style={{ maxWidth: "780px", margin: "0 auto 2.5rem auto" }}>
        <h3 style={{ ...h3Style, textAlign: "center" }}>Who Is It For?</h3>
      </div>
      <div className={styles.audienceGridStyle}>
        {audiences.map(({ label, body }) => (
          <div key={label} className={styles.audienceCardStyle}>
            <p style={{ fontWeight: 700, marginBottom: "1.0rem" }}>{label}</p>
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
