import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'CCC',
  tagline: 'Common Cloud Controls',
  favicon: 'img/logo/2023_FinosCCC_Icon.svg',

  // Set the production url of your site here
  url: 'https://ccc.finos.org',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'finos', // Usually your GitHub org/user name.
  projectName: 'commmon-cloud-controls', // Usually your repo name.

  onBrokenLinks: 'warn',
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
        docs: false,
        "theme": {
          "customCss": "./src/css/custom.css"
        }
      }
    ],
  ],

  plugins: [
    './src/plugin/ccc-pages/index.ts',
    './src/plugin/cfi-pages/index.ts',
    './src/plugin/catalog-routes/index.ts',
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/logo/2023_FinosCCC_Horizontal.png',
    navbar: {
      title: '',
      logo: {
        alt: 'CCC Logo',
        src: 'img/logo/2023_FinosCCC_Horizontal.svg',
        srcDark: 'img/logo/2023_FinosCCC_Horizontal_WHT.svg'
      },
      items: [
        { to: '/about', label: 'About', position: 'left' },
        { to: '/catalogs', label: 'Catalogs', position: 'left' },
        { to: '/threats', label: 'Threats', position: 'left' },
        { to: '/controls', label: 'Controls', position: 'left' },
        { to: '/capabilities', label: 'Capabilities', position: 'left' },
        { to: '/cfi', label: 'Test Results', position: 'left' },
        {
          href: 'https://github.com/finos/common-cloud-controls',
          label: 'GitHub',
          position: 'right',
        }
      ],
    },
    footer: {
      style: 'dark',

      copyright: `Copyright © ${new Date().getFullYear()} finos.org. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
