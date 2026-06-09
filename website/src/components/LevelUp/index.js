import React from "react";
import HomeSection from "../HomeSection";
import styles from "./styles.module.css";

export default function LevelUp() {
  return (
    <HomeSection title="Level Up Your Process">
      <p style={{ color: "var(--gf-color-text-subtle)", fontSize: "1.05rem", lineHeight: 1.75, maxWidth: "780px", textAlign: "center", margin: "0 auto 1rem auto" }}>
          Achieving fully automated governance requires moving from static compliance documents to executable design requirements. Here is how your team can leverage the CCC project to build a robust GRC Engineering pipeline.
        </p>

        {/* Horizontal process flow */}
        <div style={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap", gap: "0", maxWidth: "1000px", margin: "0 auto", justifyContent: "center" }}>
          {[
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "2rem", height: "2rem" }}>
                  <path d="M12 2v13M8 11l4 4 4-4M4 18h16" />
                </svg>
              ),
              title: "Import the Core Catalog",
              body: "Pull in the FINOS CCC Core Catalog — a foundational baseline of reusable, technology-agnostic threat and control definitions. A shared, authoritative starting point your whole team can build from."
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "2rem", height: "2rem" }}>
                  <circle cx="6" cy="12" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="18" cy="18" r="2" />
                  <path d="M8 12h4m2-4.5L10 10m4 2.5L10 15" />
                </svg>
              ),
              title: "Build Technology-Specific Catalogs",
              body: "Import core definitions into your organization's environments, or extend our technology-specific catalogs to fit your needs. Assess capabilities, map threats, and applying precise mitigation controls where they matter."
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "2rem", height: "2rem" }}>
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                </svg>
              ),
              title: "Automate Tests Using Assessment Requirements",
              body: "Every control ships with tightly scoped, verifiable assessment requirements. Translate them into scans, code analyses, or behavioral checks — wired into your pipelines as gates that block non-compliant resources before production."
            }
          ].map((step, i, arr) => (
            <React.Fragment key={step.title}>
              <div style={{
                flex: "1",
                minWidth: "220px",
                maxWidth: "360px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                border: "1px solid",
                borderRadius: "1rem",
                padding: "1rem",
                backgroundColor: "rgb(0, 181, 226)",
                color: "#ffffff",
              }}>
                <div style={{
                  borderRadius: "50%",
                  width: "3.5rem",
                  height: "3.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#0086bf"
                }}>
                  {step.icon}
                </div>
                <p style={{ margin: "0 0 0.5rem", fontWeight: 700, fontSize: "1rem" }}>{step.title}</p>
                <p style={{ margin: 0, lineHeight: 1.7, fontSize: "0.9rem" }}>{step.body}</p>
              </div>
              {i < arr.length - 1 && (
                <>
                  <div className={styles.arrow}>
                    <span className={styles.desktopOnly}>→</span>
                    <span className={styles.mobileOnly}>↓</span>
                  </div>
                </>
              )}
            </React.Fragment>
          ))}
        </div>
    </HomeSection>
  );
}
