import { useLocation } from "@docusaurus/router";
import Link from "@docusaurus/Link";
import routes from "@generated/routes";
import styles from "./index.module.css";

type DocusaurusRouteConfig = { path?: string; routes?: DocusaurusRouteConfig[] };

function collectRegisteredPaths(routeList: DocusaurusRouteConfig[]): string[] {
  const out: string[] = [];
  for (const entry of routeList) {
    if (typeof entry.path === "string") {
      out.push(entry.path);
    }
    if (Array.isArray(entry.routes)) {
      out.push(...collectRegisteredPaths(entry.routes));
    }
  }
  return out;
}

const KNOWN_ROUTE_PATHS = new Set(collectRegisteredPaths(routes as DocusaurusRouteConfig[]));

function isRegisteredRoute(pathname: string): boolean {
  const normalized = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  if (KNOWN_ROUTE_PATHS.has(normalized)) return true;
  return KNOWN_ROUTE_PATHS.has(`${normalized}/`);
}

function isFilteredPartType (part: string) {
  const regexp = new RegExp('v[0-9]*\.[0-9]+');
  return regexp.test(part) || part=="catalogs" || part=="DEV";
}

const Breadcrumb = () => {
  const location = useLocation();
  const pathParts = location.pathname.split("/").filter(Boolean);

  // Build the visible crumbs (dropping filtered segments), then collapse any
  // consecutive crumbs that render to the same label. The core catalog lives at
  // /catalogs/core/core, which would otherwise show the label twice in a row.
  const crumbs: { label: string; to: string; isLastPart: boolean }[] = [];
  pathParts.forEach((part, index) => {
    if (isFilteredPartType(part)) return;
    const label = format(part);
    const to = "/" + pathParts.slice(0, index + 1).join("/");
    const isLastPart = index === pathParts.length - 1;
    const prev = crumbs[crumbs.length - 1];
    if (prev && prev.label === label) {
      // Same label as the previous crumb: keep the deeper path so the link
      // still resolves to the leaf page.
      prev.to = to;
      prev.isLastPart = isLastPart;
    } else {
      crumbs.push({ label, to, isLastPart });
    }
  });

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.link}>Home</Link>
      {crumbs.map(({ label, to, isLastPart }) => {
        const showLink = !isLastPart && isRegisteredRoute(to);
        return (
          <span key={to}>
            {" > "}
            {showLink ? (
              <Link to={to} className={styles.link}>{label}</Link>
            ) : (
              <span className={isLastPart ? styles.current : undefined}>{label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;

const format = (part: string): string => {
  if (part === "core") return "Common Cloud Controls";
  if (part === "cfi") return "CFI";
  return part;
};
