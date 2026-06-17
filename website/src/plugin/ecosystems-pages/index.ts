import type { LoadContext, Plugin } from "@docusaurus/types";


const pages = [
  'prowler',
  'privateer', 
  'azure-policy',
  'azure-verified-modules',
  'aws-lightning-lane', 
  'gemara', 
  'grc-store', 
  'github-releases',
  'calmsuite'
];
export default function pluginEcosystemsPages(context: LoadContext): Plugin<void> {
  return {
    name: "ecosystems-pages",

    async contentLoaded({ actions }) {
      const { createData, addRoute } = actions;

      pages.forEach(page => {
        addRoute({
          path: "/ecosystems/"+page,
          component: "@site/src/components/ecosystems/"+page+"/index.tsx",
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
