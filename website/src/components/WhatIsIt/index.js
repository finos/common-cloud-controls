import React from "react";
import styles from "./styles.module.css";
import HomeSection from "../HomeSection";
import ImageBullet from "../ImageBullet";

export default function Benefits() {
  return (
    <HomeSection title="What Is It?">
      <>
        <p className={styles.strap}>
          FINOS Common Cloud Controls (FINOS CCC) is an open standard project that describes <strong>consistent controls for compliant public cloud deployments</strong> in the financial services (FS) sector.
        </p>
        <p className={styles.strap}>
          This standard is a collaborative project which aims to develop a unified set of <strong>cybersecurity, resiliency, and compliance controls</strong> for common services across the major cloud service providers (CSPs).
        </p>
        <div className={styles.cta}>
          <a target="_blank" href="/docs/resources/training/FINOS-CCC-Primer-June-2024.pdf">
            <img src="/img/icons/pdf.svg" alt="PDF Icon" />
            <p>Download CCC Primer</p>
          </a>
        </div>
      </>
    </HomeSection>
  );
}
