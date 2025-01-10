import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'CCC',
  tagline: 'Common Cloud Controls',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://ccc.finos.org',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'finos', // Usually your GitHub org/user name.
  projectName: 'commmon-cloud-controls', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/finos/common-cloud-controls/edit/main/docs',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/logo/2023_FinosCCC_Horizontal.png',
    navbar: {
      title: 'CCC',
      logo: {
        alt: 'CCC Logo',
        src: 'img/logo/2023_FinosCCC_Icon_BLK.svg',
        srcDark: 'img/logo/2023_FinosCCC_Icon_WHT.svg'
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Primer',
          to: 'https://github.com/finos/common-cloud-controls/blob/main/docs/resources/training/FINOS-CCC-Primer-June-2024.pdf'
        },
        { to: 'https://github.com/finos/common-cloud-controls/releases', label: 'Releases', position: 'left' },
        { to: '/docs/intro', label: 'Browse', position: 'left' },
        {
          href: 'https://github.com/finos/common-cloud-controls',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Primer',
              to: 'https://github.com/finos/common-cloud-controls/blob/main/docs/resources/training/FINOS-CCC-Primer-June-2024.pdf',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/docusaurus',
            },
            {
              label: 'Discord',
              href: 'https://discordapp.com/invite/docusaurus',
            },
            {
              label: 'X',
              href: 'https://x.com/docusaurus',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/finos/common-cloud-controls'
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Finos.org. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
