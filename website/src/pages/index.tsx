import type { ReactNode } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import styles from "./index.module.css";
import Benefits from "../components/Benefits";
import WhatIsIt from "../components/WhatIsIt";
import LearnMore from "../components/LearnMore";
import Releases from "../components/Releases";
import NewSplashTop from "../components/NewSplashTop";
import Contributors from "../components/Contributors";

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="Common Cloud Controls" description="Description will go into a meta tag in <head />">
      <NewSplashTop />
      <main>
        <WhatIsIt />
        <Benefits />
        <LearnMore />
        <Releases />
        <Contributors />
      </main>
    </Layout>
  );
}
