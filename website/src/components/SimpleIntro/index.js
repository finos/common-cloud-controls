import React from "react";
import styles from "./styles.module.css";
import HomeSection from "../HomeSection";

export default function SimpleIntro() {
  return (
    <HomeSection title="Technology-agnostic security controls for public and private cloud.">
        <img
    src="/img/diagrams/ccc-diagram.svg"
    alt="CCC architecture diagram"
    style={{
      display: "block",
      margin: "0 auto",
      maxWidth: "100%",
      width: "720px",
      maxHeight: "340px",
      objectFit: "contain",
    }}
  />
        <p className={styles.strap}>
          Automated Governance is Within Reach.
        </p>
    </HomeSection>
  );
}
