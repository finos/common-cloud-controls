import React from "react";
import styles from "./styles.module.css";
import HomeSection from "../HomeSection";

export default function Benefits() {
  return (
    <HomeSection title="Where Next?">
      <p style={{ textAlign: "center" }}>Common Cloud Controls is starting to release recommendations and test infrastructure. </p>
      <p style={{ textAlign: "center" }}>
        <a href="/ccc">Our online browseable catalog</a>
      </p>

      <p style={{ textAlign: "center" }}>
        <a href="/cfi">Test results for Compliant Financial Infrastructure (CFI)</a>
      </p>

      <p style={{ textAlign: "center" }}>
        <a href="https://github.com/finos/common-cloud-controls/releases">The CCC Github Releases Page</a>
      </p>

      <p style={{ textAlign: "center" }}>
        <a href="https://github.com/finos-labs/ccc-cfi-compliance">CFI Testing GitHub</a>
      </p>

      <p style={{ textAlign: "center" }}>
        <a href="https://github.com/finos#common-cloud-controls">Join A CCC Meeting and meet the team</a>
      </p>
    </HomeSection>
  );
}
