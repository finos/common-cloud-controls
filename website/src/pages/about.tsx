import type { ReactNode } from "react";
import Layout from "@theme/Layout";
import AdvanceAutomatedGovernance from "../components/AdvanceAutomatedGovernence";
import VideoCarousel from "../components/VideoCarousel";
import styles from "./about.module.css";

export default function About(): ReactNode {
  return (
    <Layout title="Advance Your Automated Governance" description="How to use FINOS Common Cloud Controls to build automated governance pipelines">
      <main>
        <div className={styles.videoWrapper}>
          <div className={styles.videoContainer}>
            <iframe
              src="https://www.youtube.com/embed/w0o_KH_in98?start=7"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>
        <AdvanceAutomatedGovernance />
        <VideoCarousel />
      </main>
    </Layout>
  );
}
