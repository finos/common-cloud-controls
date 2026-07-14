import type { ReactNode } from "react";
import Layout from "@theme/Layout";
import AdvanceAutomatedGovernance from "../components/AdvanceAutomatedGovernence";
import VideoCarousel from "../components/VideoCarousel";

export default function About(): ReactNode {
  return (
    <Layout title="Advance Your Automated Governance" description="How to use FINOS Common Cloud Controls to build automated governance pipelines">
      <main>
        <AdvanceAutomatedGovernance />
        <VideoCarousel />
      </main>
    </Layout>
  );
}
