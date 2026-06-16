import type { LoadContext, Plugin } from "@docusaurus/types";

export default function pluginCFIPages(context: LoadContext): Plugin<void> {
  return {
    name: "contributors-pages",

    async contentLoaded({ actions }) {
      const { createData, addRoute } = actions;

      addRoute({
        path: "/contributors",
        component: "@site/src/components/Contributors/index.tsx",
        exact: true,
      });

      console.log("Added route for /contributors");
    },
  };
}
