import React from "react";
import styles from "./styles.module.css";
import HomeSection from "../HomeSection";
import ImageBullet from "../ImageBullet";

export default function Benefits() {
  return (
    <HomeSection title="What are the Benefits?">
      <>
        <section className={styles.benefit}>
          <h3>💯 Defining Best Practices Around Cloud Security</h3>
          <p>CCC aims to standardize cloud security controls for the banking sector, providing a common set of controls that CSPs can implement to meet the requirements of FS firms. As multiple FS firms are involved in the project, effort is shared, the controls will be representative of the sector as a whole, and be more robust than any one firm could develop on its own. </p>
        </section>
        <section className={styles.benefit}>
          <h3>🎯 One Target For CSPs To Conform To </h3>
          <p>If all FS firms specify their own cloud infrastructure requirements, CSPs will have to conform to multiple standards. CCC aims to provide a single target for CSPs to conform to. </p>
        </section>
        <section className={styles.benefit}>
          <h3>🎒 Sharing The Burden Of A Common Definition</h3>
          <p>CCC aims to reduce the burden of compliance for CSPs by providing a common definition of controls which they can adopt. As CCC controls are specified in a cloud-agostic way, CSPs can implement them in a way that is consistent with their own infrastructure, while delivering services that FS firms understand and trust.</p>
        </section>
        <section className={styles.benefit}>
          <h3>🧭 A Path Towards Common Implementation </h3>
          <p>
            FINOS sister project, <a href="https://github.com/finos/compliant-financial-infrastructure">Compliant Financial Infrastructure</a> aims to be a downstream implementation of the CCC controls standard. In tandem with CCC, this will provide FS firms with a one-stop shop for secure cloud infrastructure deployment.
          </p>
        </section>
        <section className={styles.benefit}>
          <h3>🥇 A Path Towards Certification</h3>
          <p>
            It is envisaged that eventually, CCC will offer <em>certification</em> for CSPs who conform to the standard.
          </p>
        </section>
      </>
    </HomeSection>
  );
}
