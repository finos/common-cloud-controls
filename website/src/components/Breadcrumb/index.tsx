import { useLocation } from "@docusaurus/router";
import Link from "@docusaurus/Link";
import routes from "@generated/routes";

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

/** Paths Docusaurus registered at build time (docs, plugins, etc.). */
const KNOWN_ROUTE_PATHS = new Set(collectRegisteredPaths(routes as DocusaurusRouteConfig[]));

function isRegisteredRoute(pathname: string): boolean {
  const normalized = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  if (KNOWN_ROUTE_PATHS.has(normalized)) {
    return true;
  }
  return KNOWN_ROUTE_PATHS.has(`${normalized}/`);
}

const Breadcrumb = () => {
  const location = useLocation();
  const pathParts = location.pathname.split("/").filter(Boolean);

  return (
    <nav className="text-sm text-gray-500 mb-4 mx-32 py-5">
      <Link to="/" className="px-3 hover:bg-gray-200 rounded-full hover:no-underline">
        Home
      </Link>
      {pathParts.map((part, index) => {
        const to = "/" + pathParts.slice(0, index + 1).join("/");
        const isLastPart = index === pathParts.length - 1;
        const showLink = !isLastPart && isRegisteredRoute(to);

        return (
          <span key={to}>
            {" > "}
            {showLink ? (
              <Link to={to} className="px-3 rounded-full hover:bg-gray-200 hover:no-underline">
                {format(part)}
              </Link>
            ) : (
              <span className={`px-3 rounded-full ${isLastPart ? "bg-gray-200" : ""}`}>{format(part)}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;

const format = (part: string): string => {
  if (part === "ccc") {
    return "Common Cloud Controls";
  }

  return part;
};
