import React from "react";
import HomeSection from "../HomeSection";
import Link from "@docusaurus/Link";

const boxes = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "2rem", height: "2rem" }}>
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
      </svg>
    ),
    title: "Contribute on GitHub",
    body: "Browse open issues, submit pull requests, and help shape the catalog. All contributions — big or small — are welcome.",
    href: "https://github.com/finos/common-cloud-controls",
    cta: "View Repository",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "2rem", height: "2rem" }}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "Join the Slack Channel",
    body: "Connect with contributors and maintainers in real time. Ask questions, share ideas, and stay up to date with project news.",
    href: "https://finos-lf.slack.com/messages/common-cloud-controls/",
    cta: "Open Slack",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "2rem", height: "2rem" }}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: "Attend Working Group Meetings",
    body: "Join our regular open calls to discuss roadmap priorities, review proposals, and collaborate with the broader community.",
    href: "https://zoom-lfx.platform.linuxfoundation.org/meetings/finos?view=week",
    cta: "See Meeting Schedule",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "2rem", height: "2rem" }}>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    title: "Subscribe to Updates",
    body: "Follow FINOS to receive announcements about new releases, events, and community highlights straight to your inbox.",
    href: "https://www.finos.org/common-cloud-controls-project",
    cta: "Learn More at FINOS",
  },
];

export default function JoinCommunity() {
  return (
    <HomeSection title="Join the Community">
      <p style={{ color: "var(--gf-color-text-subtle)", fontSize: "1.05rem", lineHeight: 1.75, maxWidth: "780px", textAlign: "center", margin: "0 auto 2rem auto" }}>
        Common Cloud Controls is an open, community-driven project. There are many ways to get involved — pick the one that works best for you.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", justifyContent: "center", maxWidth: "1100px", margin: "0 auto" }}>
        {boxes.map((box) => (
          <div key={box.title} style={{
            flex: "1",
            minWidth: "220px",
            maxWidth: "240px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            border: "1px solid",
            borderRadius: "1rem",
            padding: "1.5rem 1.25rem",
            gap: "0.75rem",
          }}>
            <div style={{
              borderRadius: "50%",
              width: "3.5rem",
              height: "3.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#777c85",
              flexShrink: 0,
            }}>
              {box.icon}
            </div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>{box.title}</p>
            <p style={{ margin: 0, lineHeight: 1.7, fontSize: "0.9rem", color: "var(--gf-color-text-subtle)", flexGrow: 1 }}>{box.body}</p>
            <Link
              href={box.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--gf-color-accent)" }}
            >
              {box.cta} →
            </Link>
          </div>
        ))}
      </div>
    </HomeSection>
  );
}
