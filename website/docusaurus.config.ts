import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "CCC",
  tagline: "Common Cloud Controls",
  favicon: "img/logo/2023_FinosCCC_Icon.svg",

  // Set the production url of your site here
  url: "https://ccc.finos.org",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "finos", // Usually your GitHub org/user name.
  projectName: "commmon-cloud-controls", // Usually your repo name.

  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      },
    ],
  ],

  plugins: ["./src/plugin/ccc-pages/index.ts", "./src/plugin/cfi-pages/index.ts", "./src/plugin/catalog-routes/index.ts", "./src/plugin/ecosystems-pages/index.ts"],

  themeConfig: {
    style: "dark",
    // Replace with your project's social card
    image: "img/logo/2023_FinosCCC_Horizontal.png",
    navbar: {
      title: "",
      logo: {
        alt: "CCC Logo",
        src: "img/logo/2023_FinosCCC_Horizontal.svg",
        srcDark: "img/logo/2023_FinosCCC_Horizontal_WHT.svg",
      },
      items: [
        { to: "/about", label: "About", position: "left" },
        { to: "/catalogs/core", label: "CCC Catalogs", position: "left" },
        { to: "/threats", label: "Threats", position: "left" },
        { to: "/controls", label: "Controls", position: "left" },
        { to: "/capabilities", label: "Capabilities", position: "left" },
        { to: "/metadata", label: "Metadata", position: "left" },
        { to: "/cfi", label: "Test Results", position: "left" },
        {
          label: 'Ecosystems',
          to: '/ecosystems',
          position: 'right',
          type: 'dropdown',
          items: [
            { to: '/ecosystems/prowler', label: 'Prowler' },
            { to: '/ecosystems/privateer', label: 'Privateer' },
            { to: '/ecosystems/azure-policy', label: 'Azure Policy' },
            { to: '/ecosystems/azure-verified-modules', label: 'Azure Verified Modules' },
            { to: '/ecosystems/aws-lightning-lane', label: 'AWS Lightning Lane' },
            { to: '/ecosystems/gemara', label: 'Gemara' },
            { to: '/ecosystems/grc-store', label: 'GRC.Store' },
            { to: '/ecosystems/github-releases', label: 'GitHub releases' },

          ],
        },
        {
          href: 'https://github.com/finos/common-cloud-controls',
          label: 'GitHub',
          position: 'right',
        }
      ],
    },
    footer: {
      logo: {
        alt: "FINOS Logo",
        src: "img/logo/finos/finos-blue.png",
        href: "https://www.finos.org/",
        height: 55,
      },
      links: [
        {
          label: "Contributors",
          href: "/contributors",
        },
        {
          label: "Github",
          href: "https://github.com/finos/common-cloud-controls/blob/main/README.md",
        },
        {
          label: "Calendar",
          href: "https://zoom-lfx.platform.linuxfoundation.org/meetings/finos?view=month",
        },
        {
          label: "All Hands Meeting",
          href: "https://zoom-lfx.platform.linuxfoundation.org/meeting/95756611623?password=64d02ae0-6cec-428f-87a0-cb8be5f39945",
        },
        {
          label: "About",
          to: "/about",
        },
        {
          label: "CCC Catalogs",
          to: "/catalogs/core",
        },
        {
          label: "Threats",
          to: "/threats",
        },
        {
          label: "Controls",
          to: "/controls",
        },
        {
          label: "Capabilities",
          to: "/capabilities",
        },
        {
          label: "Metadata",
          to: "/metadata",
        },
        {
          label: "Test Results",
          to: "/cfi",
        },
      ],

      copyright: `Copyright © ${new Date().getFullYear()} finos.org. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
