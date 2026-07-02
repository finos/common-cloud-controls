import type { LoadContext, Plugin } from "@docusaurus/types";


const pages = [
  { slug: 'prowler', ext: 'mdx' },
  { slug: 'privateer', ext: 'mdx' },
  { slug: 'azure-policy', ext: 'mdx' },
  { slug: 'azure-verified-modules', ext: 'mdx' },
  { slug: 'aws-lightning-lane', ext: 'mdx' },
  { slug: 'gemara', ext: 'mdx' },
  { slug: 'grc-store', ext: 'mdx' },
  { slug: 'github-releases', ext: 'mdx' },
  { slug: 'calmsuite', ext: 'mdx' },
];
export default function pluginEcosystemsPages(context: LoadContext): Plugin<void> {
  return {
    name: "ecosystems-pages",

    async contentLoaded({ actions }) {
      const { createData, addRoute } = actions;

      pages.forEach(({ slug, ext }) => {
        addRoute({
          path: "/ecosystems/"+slug,
          component: `@site/src/components/ecosystems/${slug}/index.${ext}`,
          exact: true,
        });
      });

      addRoute({
        path: "/ecosystems",
        component: "@site/src/components/ecosystems/Home/index.tsx",
        exact: true,
      });
    },
  };
}
