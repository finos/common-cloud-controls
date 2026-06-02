import React from "react";
import HomeSection from "../HomeSection";
const ReactPlayer = React.lazy(() => import("react-player/lazy"));
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
const videos = [
  {
    url: "https://www.finos.org/hubfs/OSFF%202025%20(Open%20Source%20in%20Finance%20Forum)/OSFF%20London%202025/Video/Breakout%20Talks/Mutualizing%20Risk%20and%20Compliance%20in%20the%20Open/Taming%20Multi-Cloud%20Security_%20Progress%20on%20Common%20Cloud%20Controls%20-%20Michael%20Lysaght%20%26%20Sonali%20Mendis.mp4",
    caption: "Taming Multi-Cloud Security: Progress on Common Cloud Controls — Michael Lysaght & Sonali Mendis"
  },
  {
    url: "https://www.finos.org/hubfs/OSFF%202025%20(Open%20Source%20in%20Finance%20Forum)/OSFF%20New%20York%20NYC%202025/OSFF%20NYC%202025%20Videos/The%20Launchpad%20Incubating%20FINOS%20Projects/Before%20You%20Build%2C%20Check%20What%20You%20Have_%20Practical%20Approaches%20To%20Assess%20Compliance%20B...%20Santosh%20Maurya.mp4",
    caption: "Before You Build, Check What You Have: Practical Approaches To Assess Compliance — Santosh Maurya"
  },
  {
    url: "https://www.youtube.com/watch?v=XjBXGHK2a9c",
    caption: "Turn CCC into Real Checks: Multi-Cloud Security with Prowler + AI (OSFF NY Preview)"
  },
  {
    url: "https://youtu.be/8hMRahzwK3k",
    caption: "Damien Burks (Citi) and Gupta Rudra (Krumware) discuss CCC at OSFF New York 2024."
  },
  {
    url: "https://youtu.be/t0gksHTRTVw",
    caption: "Jared Lambert (Microsoft) talks about the compliance landscape at OSFF New York 2024."
  },
  {
    url: "https://youtu.be/AoGH_uw5M2Y",
    caption: "Eddie Knight (Sonatype)'s vertical slice demo of CCC at OSFF New York 2023."
  },
  {
    url: "https://youtu.be/dE6eOYvpauU",
    caption: "Jim Adams (Citi) and others discuss the need for CCC at OSFF New York 2023."
  },
  {
    url: "https://youtu.be/ITFNeStAebs",
    caption: "Naseer Mohammed (Google) and Simon Zhang (BMO) discuss CCC at OSFF New York 2023."
  },
  {
    url: "https://youtu.be/cg3I53R59Iw",
    caption: "Kim Prado (BMO)'s keynote session on Cloud Controls at OSFF 2023."
  }
];

function videoThumbnail(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  // For non-YouTube videos, return true to enable light mode with a generic
  // play button overlay. This prevents eager video downloads that block page load.
  return true;
}

export default function AdvanceAutomatedGovernance() {
  return (
    <HomeSection title="Advance Your Automated Governance">
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "2rem",
        }}
      >
        <div style={{maxWidth: 650, flex: 1 }}>
          <div style={{ position: "relative", paddingLeft: "2rem"}}>
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
          <div>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 700, marginTop: "2rem" }}>
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
            <h3 style={{ fontSize: "1.3rem", fontWeight: 700 }}>
              Three Catalogs, One Complete Picture
            </h3>
            <p style={{ lineHeight: 1.75, fontSize: "0.975rem" }}>
              Each cloud service is covered by three interlocking catalog types — Capabilities, Threats, and Controls — because real-world governance requires all three layers to be explicit and independently reusable.
            </p>
            <p style={{ lineHeight: 1.75, fontSize: "0.975rem" }}>
              Keeping them separate means your team can import only what is relevant, compose new service catalogs from existing building blocks, and map controls directly to the threats they mitigate — without carrying the weight of definitions you don't need.
            </p>
            <img
              src="/img/diagrams/catalogs-diagram.svg"
              alt="CCC catalog structure diagram"
              style={{ display: "block", maxWidth: "350px", width: "100%", height: "auto", margin: "0 auto" }}
            />
          </div>
          <div style={{ width: "300px", flexShrink: 0, minWidth: "280px" }}>
          </div>
        </div>
        <div style={{ width: "300px", flexShrink: 0, minWidth: "280px" }}>
          <div className="video-list">
            {videos.map((v) => (
              <figure key={v.url} className="video-item" style={{ margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{
                  borderRadius: "var(--gf-radius-lg)",
                  overflow: "hidden",
                  background: "var(--gf-color-surface)",
                  border: "1px solid var(--gf-color-border-strong)",
                  aspectRatio: "16/9",
                  position: "relative"
                }}>
                  <React.Suspense fallback={<div style={{ width: "100%", height: "100%", background: "var(--gf-color-surface)" }} />}>
                    <ReactPlayer url={v.url} width="100%" height="100%" controls light={videoThumbnail(v.url)} style={{ position: "absolute", top: 0, left: 0 }} />
                  </React.Suspense>
                </div>
                <figcaption style={{ fontSize: "0.9rem", color: "var(--gf-color-text-subtle)", lineHeight: 1.5 }}>
                  {v.caption}
                </figcaption>
              </figure>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: "var(--gf-space-lg)", color: "var(--gf-color-text-subtle)" }}>
            Further videos on the{" "}
            <a
              href="https://www.youtube.com/watch?v=8hMRahzwK3k&list=PLmPXh6nBuhJuWoOHDqG4AMPVerlWYDacD"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--gf-color-accent)" }}
            >
              YouTube playlist
            </a>.
          </p>
        </div>
      </div>

    </HomeSection>
  );
}
