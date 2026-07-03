import type { ReactNode } from "react";
import Layout from "@theme/Layout";
import NewSplashTop from "../components/NewSplashTop";
import SimpleIntro from "../components/SimpleIntro";
import LevelUp from "../components/LevelUp";
import TheStory from "../components/TheStory";
import SteeringCommittee from "../components/SteeringCommittee";
import JoinCommunity from "../components/JoinCommunity";
import styles from "./index.module.css";

export default function Home(): ReactNode {
  return (
    <Layout title="Common Cloud Controls" description="Description will go into a meta tag in <head />">
      {/* SVG clip-path: full-width rectangle, bottom edge curves down at centre */}
      <svg width="0" height="0" style={{ position: "absolute", overflow: "hidden" }}>
        <defs>
          <clipPath id="hero-wave-clip" clipPathUnits="objectBoundingBox">
            <path d="M0,0 L1,0 L1,0.82 Q0.5,1 0,0.82 Z" />
          </clipPath>
        </defs>
      </svg>

      <main>
        <section
          style={{
            clipPath: "url(#hero-wave-clip)",
            backgroundColor: "var(--gf-color-background-strong)",
            padding: "2rem 2rem",
            maxWidth: "100rem",
            margin: "auto",
            paddingBottom: "4rem",
            marginBottom: "0",
            color: "#1e3b8a",
          }}
        >
          <NewSplashTop />
          <SimpleIntro />
          <p />
        </section>
        <div className={styles.videoWrapper}>
          <div className={styles.videoContainer}>
            <iframe
              src="https://www.youtube.com/embed/w0o_KH_in98?start=7"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>
        <TheStory />
        <LevelUp />
        <JoinCommunity />
        <SteeringCommittee />
      </main>
    </Layout>
  );
}
